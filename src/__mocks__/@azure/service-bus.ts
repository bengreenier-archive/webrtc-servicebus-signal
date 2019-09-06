/* eslint-env node, jest */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock: any = jest.genMockFromModule('@azure/service-bus')

// auto mocker does _ok_ but doesn't have correct relationships so we rebuild those
mock.ServiceBusClient.createFromConnectionString = jest.fn().mockImplementation(() => {
  const sbc = new mock.ServiceBusClient()
  sbc.createQueueClient = jest.fn().mockImplementation(() => {
    const qc = new mock.QueueClient()
    qc.createReceiver = jest.fn().mockImplementation(() => {
      return new mock.Receiver()
    })
    return qc
  })
  return sbc
})

module.exports = mock
