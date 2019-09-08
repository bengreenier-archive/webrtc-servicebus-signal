import { v4 } from 'uuid'
import SymmetricBus from '../symmetric-bus'

/* eslint-env node, jest */

type V4Mock = jest.Mock<string>
const mockV4 = (v4 as unknown) as V4Mock

describe('symmetric-bus', () => {
  it('should allocate', () => {
    expect(
      new SymmetricBus({
        initiator: false,
        connectionString: 'test',
        queues: {
          root: 'root',
          session: 'session',
        },
      })
    ).toBeInstanceOf(SymmetricBus)
  })

  it('should generate uuids', () => {
    // setup
    mockV4.mockReturnValueOnce('abc-123')
    mockV4.mockReturnValueOnce('321-cba')

    const instance = new SymmetricBus({
      initiator: true,
      connectionString: 'test',
      queues: {
        root: 'root',
        session: 'session',
      },
    })

    expect(instance.SessionId).toBe('abc-123')
    expect(instance.RemoteSessionId).toBe('321-cba')
  })
})
