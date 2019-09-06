import { Sender, ServiceBusClient, SessionReceiver, Receiver, ReceiveMode, QueueClient } from '@azure/service-bus'
import { StrictEventEmitter } from 'strict-event-emitter-types'
import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'

interface Events {
  /**
   * Fired when the bus is ready to send/recv
   */
  ready: () => void

  /**
   * Fired when a message arrives
   */
  message: (data: string) => void

  /**
   * Fired when an error occurs
   */
  error: (err: Error) => void
}

type EE = StrictEventEmitter<EventEmitter, Events>

interface SymmetricBusOpts {
  initiator: boolean
  connectionString: string
  queues: {
    root: string
    session: string
  }
}

export default class SymmetricBus extends (EventEmitter as { new (): EE }) {
  private client: ServiceBusClient

  private rootQueue: QueueClient

  private rootReceiver?: Receiver

  private rootSender?: Sender

  private sessionQueue: QueueClient

  private sessionReceiver?: SessionReceiver

  private sessionSender?: Sender

  private localSessionId?: string

  private remoteSessionId?: string

  public get SessionId(): string | undefined {
    return this.localSessionId
  }

  public get RemoteSessionId(): string | undefined {
    return this.remoteSessionId
  }

  constructor(opts: SymmetricBusOpts) {
    // the linter doesn't understand super, as we've done something nonstandard for the EE derivation
    // eslint-disable-next-line constructor-super
    super()

    this.client = ServiceBusClient.createFromConnectionString(opts.connectionString)
    this.rootQueue = this.client.createQueueClient(opts.queues.root)
    this.sessionQueue = this.client.createQueueClient(opts.queues.session)

    if (opts.initiator) {
      this.localSessionId = uuid()
      this.remoteSessionId = uuid()

      // listen to our localSession
      this.sessionReceiver = this.sessionQueue.createReceiver(ReceiveMode.receiveAndDelete, { sessionId: this.localSessionId })
      this.sessionReceiver.registerMessageHandler(
        async sessionMsg => {
          this.emit('message', sessionMsg.body)
        },
        err => {
          this.emit('error', err)
        }
      )

      this.rootSender = this.rootQueue.createSender()

      // tell the world we exist
      this.rootSender
        .send({
          body: JSON.stringify({
            localSessionId: this.localSessionId,
            remoteSessionId: this.remoteSessionId,
            clientVersion: 1,
          }),
        })
        .then(
          () => {
            if (this.rootSender) {
              this.rootSender.close()
            }

            this.emit('ready')
          },
          err => {
            this.emit('error', err)
          }
        )
    } else {
      this.rootReceiver = this.rootQueue.createReceiver(ReceiveMode.receiveAndDelete)
      this.rootReceiver.registerMessageHandler(
        async rootMsg => {
          const parsed = JSON.parse(rootMsg.body)

          // intentionally cross-wired (as we're the receiver, not the initiator)
          this.localSessionId = parsed.remoteSessionId
          this.remoteSessionId = parsed.localSessionId

          if (this.rootReceiver) {
            await this.rootReceiver.close()
          }

          this.emit('ready')

          this.sessionReceiver = this.sessionQueue.createReceiver(ReceiveMode.receiveAndDelete, { sessionId: this.localSessionId })
          this.sessionReceiver.registerMessageHandler(
            async sessionMsg => {
              this.emit('message', sessionMsg.body)
            },
            err => {
              this.emit('error', err)
            }
          )
        },
        err => {
          this.emit('error', err)
        }
      )
    }
  }

  public async send(data: string): Promise<void> {
    if (!this.remoteSessionId) {
      throw new Error('Not ready to send')
    }

    if (!this.sessionSender) {
      this.sessionSender = this.sessionQueue.createSender()
    }

    await this.sessionSender.send({
      body: data,
      sessionId: this.remoteSessionId,
      replyToSessionId: this.localSessionId,
    })
  }

  public destroy(): void {
    if (this.sessionSender && !this.sessionSender.isClosed) {
      this.sessionSender.close()
    }

    if (this.sessionReceiver && !this.sessionReceiver.isClosed) {
      this.sessionReceiver.close()
    }

    if (this.sessionQueue) {
      this.sessionQueue.close()
    }

    if (this.rootSender && !this.rootSender.isClosed) {
      this.rootSender.close()
    }

    if (this.rootReceiver && !this.rootReceiver.isClosed) {
      this.rootReceiver.close()
    }

    if (this.rootQueue) {
      this.rootQueue.close()
    }

    if (this.client) {
      this.client.close()
    }

    this.remoteSessionId = undefined
    this.localSessionId = undefined
  }
}
