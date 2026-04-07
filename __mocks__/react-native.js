// Mock react-native for tests
const React = require('react')

// Custom FlatList mock that actually renders items
const FlatListMock = React.forwardRef(({ data, renderItem, ListEmptyComponent, ...props }, ref) => {
  if (!data || data.length === 0) {
    return ListEmptyComponent
  }
  return React.createElement(
    'View',
    { testID: props.testID || 'flat-list' },
    data.map((item, idx) => {
      const { key, ...itemProps } = renderItem({ item, index: idx })
      return React.cloneElement(itemProps, { key: item.id || idx })
    })
  )
})

module.exports = {
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  Modal: 'Modal',
  FlatList: FlatListMock,
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
  Dimensions: {
    get: (dim) => {
      if (dim === 'window') return { width: 375, height: 812 }
      if (dim === 'screen') return { width: 375, height: 812 }
      return { width: 375, height: 812 }
    },
    addEventListener: () => ({ remove: () => {} }),
  },
  Image: 'Image',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Alert: { alert: jest.fn() },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style) : style),
    hairlineWidth: 1,
  },
}
