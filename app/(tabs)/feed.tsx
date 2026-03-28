import { View, Text, StyleSheet } from 'react-native'

export default function FeedTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.subtitle}>Trip sharing coming soon. Plan your first trip to get started.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
})
