import inquirer from 'inquirer'
import SymmetricBus from '../lib/symmetric-bus'

/**
 * Example flow that creates half servers/half clients and sends a single message from one to the other
 * If the message is sent/received (depending on side of the connection) successfully, the client is destroyed
 *
 * If the process doesn't automatically exit, there's an error
 *
 * Prompts for:
 * Azure Connection String
 * Root Queue Name
 * Session Queue Name
 * Number of Talkers
 */
export default async (): Promise<void> => {
  const res = await inquirer.prompt([
    {
      type: 'input',
      name: 'connStr',
      message: 'Azure Service Bus Connection String',
    },
    {
      type: 'input',
      name: 'rootQueue',
      message: 'Root Queue Name',
    },
    {
      type: 'input',
      name: 'sessionQueue',
      message: 'Session Queue Name',
    },
    {
      type: 'number',
      name: 'talkers',
      message: 'Total number of talkers',
    },
  ])

  const half = res.talkers / 2
  const serverMessage = "hello i'm a server"
  const clientMessage = "hello i'm a client"

  for (let i = 0; i < half; i += 1) {
    // allocate server
    const server = new SymmetricBus({
      initiator: true,
      connectionString: res.connStr,
      queues: {
        root: res.rootQueue,
        session: res.sessionQueue,
      },
    })

    server.on('error', (err: Error) => {
      // eslint-disable-next-line no-console
      console.error(err)
    })

    server.on('ready', () => {
      server.send(clientMessage)
    })
    server.on('message', data => {
      if (data === serverMessage) {
        server.destroy()
      }
    })

    // allocate client
    const client = new SymmetricBus({
      initiator: false,
      connectionString: res.connStr,
      queues: {
        root: res.rootQueue,
        session: res.sessionQueue,
      },
    })

    client.on('error', (err: Error) => {
      // eslint-disable-next-line no-console
      console.error(err)
    })

    client.on('ready', () => {
      client.send(serverMessage)
    })
    client.on('message', data => {
      if (data === clientMessage) {
        client.destroy()
      }
    })
  }
}
