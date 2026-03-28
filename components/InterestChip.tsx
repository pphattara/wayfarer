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
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    margin: 4,
  },
  chipSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  text: { fontSize: 14, color: '#475569', fontWeight: '500' },
  textSelected: { color: '#0EA5E9', fontWeight: '700' },
})
