// Stub for react-native-url-polyfill/auto in Jest environment.
// The real polyfill triggers Expo's winter runtime globals which conflict
// with Jest's module isolation. Node already provides URL/URLSearchParams,
// so this no-op is safe for tests.
