const store = {}

module.exports = {
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn((path, contents) => {
    store[path] = contents
    return Promise.resolve()
  }),
  readAsStringAsync: jest.fn((path) => {
    if (store[path] === undefined) return Promise.reject(new Error('File not found'))
    return Promise.resolve(store[path])
  }),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  __store: store,
  __reset: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
