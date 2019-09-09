import { createMockInstance } from 'jest-create-mock-instance'
import { ServiceBusClient, QueueClient, TopicClient, SubscriptionClient, SessionReceiver, Sender } from '@azure/service-bus'

/* eslint-env node, jest */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CtorWithOptionalStatics<TType, TData = never> = TData & { new (...args: any[]): TType }

// just to keep our typings happy in our mocking-setup code below
type MockableServiceBus = {
  ServiceBusClient: CtorWithOptionalStatics<ServiceBusClient, { createFromConnectionString: () => ServiceBusClient }>
  QueueClient: CtorWithOptionalStatics<QueueClient>
  SessionReceiver: CtorWithOptionalStatics<SessionReceiver>
  Sender: CtorWithOptionalStatics<Sender>
  SubscriptionClient: CtorWithOptionalStatics<SubscriptionClient>
  TopicClient: CtorWithOptionalStatics<TopicClient>
}

const mock: jest.Mocked<MockableServiceBus> = jest.genMockFromModule('@azure/service-bus')

// auto mocker does _ok_ but doesn't have correct relationships so we rebuild those
// well, at least the ones we need :D
mock.ServiceBusClient.createFromConnectionString = jest.fn(() => {
  const sbc: jest.Mocked<ServiceBusClient> = createMockInstance(mock.ServiceBusClient)
  {
    const qc: jest.Mocked<QueueClient> = createMockInstance(mock.QueueClient)
    qc.createReceiver.mockReturnValue(createMockInstance(mock.SessionReceiver))
    {
      const s: jest.Mocked<Sender> = createMockInstance(mock.Sender)
      s.send.mockImplementation(() => Promise.resolve())

      qc.createSender.mockReturnValue(s)
    }

    const sc: jest.Mocked<SubscriptionClient> = createMockInstance(mock.SubscriptionClient)
    const tc: jest.Mocked<TopicClient> = createMockInstance(mock.TopicClient)

    sbc.createQueueClient.mockReturnValue(qc)
    sbc.createSubscriptionClient.mockReturnValue(sc)
    sbc.createTopicClient.mockReturnValue(tc)
  }
  return sbc
})

module.exports = mock
