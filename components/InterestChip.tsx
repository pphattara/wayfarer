// components/InterestChip.tsx
import { Pressable, Text, StyleSheet } from 'react-native'

interface Props {
  label: string
  emoji: string
  selected: boolean
  onPress: () => void
}

export function InterestChip({ label, emoji, selected, onPress }: Props) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {emoji} {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f9f9f9', margin: 4 },
  chipSelected: { borderColor: '#0F6E56', backgroundColor: '#e8f5f0' },
  text: { fontSize: 14, color: '#555', fontWeight: '500' },
  textSelected: { color: '#0F6E56', fontWeight: '700' },
})
