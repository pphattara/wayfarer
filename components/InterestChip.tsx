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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#f5f5f2',
    margin: 4,
  },
  chipSelected: {
    borderColor: '#0F6E56',
    backgroundColor: '#E1F5EE',
  },
  text: { fontSize: 9, color: '#6b6b66', fontWeight: '500' },
  textSelected: { color: '#0F6E56', fontWeight: '600' },
})
