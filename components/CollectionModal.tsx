import { useEffect, useState } from 'react'
import {
  Modal, View, Text, Pressable, TextInput, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useCollections } from '../hooks/useCollections'
import type { Collection } from '../types'

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (collectionId: string, collectionName: string) => void
}

export function CollectionModal({ visible, onClose, onSelect }: Props) {
  const { getCollections, createCollection } = useCollections()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    getCollections()
      .then(setCollections)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [visible])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const col = await createCollection(newName.trim())
      setCollections(prev => [...prev, col])
      setNewName('')
      onSelect(col.id, col.name)
    } catch {}
    setCreating(false)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Save to collection</Text>
          <Pressable onPress={onClose} accessibilityLabel="Close collections" accessibilityRole="button">
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color="#0F6E56" testID="loading-spinner" />
        ) : (
          <FlatList
            data={collections}
            keyExtractor={item => item.id}
            testID="collections-list"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => onSelect(item.id, item.name)}
                accessibilityLabel={`Save to ${item.name}`}
                accessibilityRole="button"
                testID={`collection-${item.id}`}
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowArrow}>›</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty} testID="no-collections">No collections yet</Text>}
          />
        )}

        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="Collection name"
            placeholderTextColor="#9b9b96"
            value={newName}
            onChangeText={setNewName}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            accessibilityLabel="New collection name"
          />
          <Pressable
            style={[styles.createBtn, (!newName.trim() || creating) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!newName.trim() || creating}
            accessibilityLabel="Create new collection"
            accessibilityRole="button"
          >
            <Text style={styles.createBtnText}>{creating ? '…' : 'Create'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd',
  },
  title: { fontSize: 17, fontWeight: '600' },
  close: { fontSize: 17, color: '#0F6E56', fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  rowName: { flex: 1, fontSize: 15, color: '#111' },
  rowArrow: { fontSize: 18, color: '#ccc' },
  empty: { textAlign: 'center', padding: 32, color: '#888' },
  createRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  createBtn: {
    backgroundColor: '#0F6E56', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center',
  },
  createBtnDisabled: { backgroundColor: '#ccc' },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
