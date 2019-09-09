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
      type: 'confirm',
      message:
        "Hello - This example will connect many talkers to ServiceBus to help to illustrate scale limits. However, before running you'll need to create a Service Bus instance in the Azure Portal. Please do that now. Inside the Service Bus you need two queues. One named 'announce' with the default settings, and one named 'session' with 'Enable sessions' ticked. Then go to Shared Access Keys, RootManageSharedAccessKey, and copy the 'Primary connection string' (you'll be prompted for it in a moment).",
      name: 'entryMessage',
    },
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

  const nodeCount = {
    client: 0,
    server: 0,
  }

  const interval = setInterval(() => {
    // eslint-disable-next-line no-console
    console.log(`Clients: ${nodeCount.client}\nServers: ${nodeCount.server}`)

    if (nodeCount.client + nodeCount.server === res.talkers) {
      clearInterval(interval)
    }
  }, 1000)

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
      nodeCount.server += 1
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
      nodeCount.client += 1
      client.send(serverMessage)
    })
    client.on('message', data => {
      if (data === clientMessage) {
        client.destroy()
      }
    })
  }
}
