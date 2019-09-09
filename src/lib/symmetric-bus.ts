import { Sender, ServiceBusClient, SessionReceiver, Receiver, ReceiveMode, QueueClient } from '@azure/service-bus'
import { StrictEventEmitter } from 'strict-event-emitter-types'
import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'

/**
 * Represents the different possible status events that a @see SymmetricBus can raise
 */
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

/**
 * Helper type for creating a strongly typed @see EventEmitter backed by @see Events
 */
type EE = StrictEventEmitter<EventEmitter, Events>

/**
 * @see SymmetricBus constructor options
 */
interface SymmetricBusOpts {
  /**
   * Indicates if we are the initiating peer
   */
  initiator: boolean

  /**
   * The Azure Service Bus connection string, used for connection
   */
  connectionString: string

  /**
   * Queue configuration
   */
  queues: {
    /**
     * The name of the root (announcement) queue
     */
    root: string

    /**
     * The name of the session (bi-directional messaging) queue
     */
    session: string
  }
}

/**
 * A service-bus wrapper that gives us the ability to send bi-directional data
 * Using a multi-channel negotiation mechanism for getting connected
 *
 * This works by first joining a "root" queue, on which announcements occur
 * If we're an "initiator", we'll announce our intent to talk, with some metadata
 * If we're not, we'll listen for intents to talk, and use the metadata to connect
 *
 * Once connected, we'll communicate using a "session" queue, on which ordered data is sent
 * In this mode, there are actually two "sessions", each one being mono-directional
 * We listen to one session, and transmit to another (while our peer does the flip)
 *
 * A "good" caller would configure timers at some reasonable interval for error handling
 * If some action does not complete in a user-reasonable time frame, error-ing and retrying is best
 *
 * This class uses events to further communicate internal status - @see Events for more info
 */
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

  /**
   * The local session id
   * @see Events as this is available only after the 'ready' event
   */
  public get SessionId(): string | undefined {
    return this.localSessionId
  }

  /**
   * The remote session id
   * @see Events as this is available only after the 'ready' event
   */
  public get RemoteSessionId(): string | undefined {
    return this.remoteSessionId
  }

  /**
   * Create an instance, to communicate with.
   * Note: It should be destroyed after use, @see destroy
   * @param opts mandatory configuration options
   */
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

  /**
   * Transmits data to the "other" peer
   * @param data the stringified data to transmit
   * @throws when we're not ready to send
   * @returns Promise that resolves when transmission has suceeded or failed
   */
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

  /**
   * Cleans up the dependencies of this instance
   * A "good" caller should call this after using an instance
   */
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
