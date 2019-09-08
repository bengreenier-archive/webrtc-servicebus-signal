/* eslint-env node, jest */

// a string mock is...a simplification. but it should do for our use cases
module.exports = jest.genMockFromModule('uuid')
