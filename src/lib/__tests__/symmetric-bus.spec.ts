import SymmetricBus from '../symmetric-bus'

/* eslint-env node, jest */

describe('symmetric-bus', () => {
  it('should fail this test', () => {
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
})
