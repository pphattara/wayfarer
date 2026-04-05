// components/CreatorRouteSheet.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import type { CreatorRoute } from '../types/social';

interface CreatorRouteSheetProps {
  route: CreatorRoute | null;
  onClose: () => void;
  onSave: (routeId: string) => void;
}

export function CreatorRouteSheet({ route, onClose, onSave }: CreatorRouteSheetProps) {
  if (!route) return null;

  return (
    <Modal
      visible={route !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close route details">
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{route.title}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(route.id)} accessibilityLabel="Save route">
            <Text style={styles.saveBtnText}>Save Route</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <View style={styles.author}>
            {route.author?.avatar_url ? (
              <Image source={{ uri: route.author.avatar_url }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Text style={styles.authorInitial}>
                  {route.author?.display_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text style={styles.authorName}>{route.author?.display_name ?? 'Unknown'}</Text>
          </View>

          <Text style={styles.summary}>{route.summary}</Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Days</Text>
              <Text style={styles.metaValue}>{route.days}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Saves</Text>
              <Text style={styles.metaValue}>{route.save_count}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Views</Text>
              <Text style={styles.metaValue}>{route.view_count}</Text>
            </View>
          </View>

          {route.tags.length > 0 && (
            <View style={styles.tags}>
              {route.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  closeBtn: { fontSize: 18, color: '#666', width: 30 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
  saveBtn: { backgroundColor: '#0F6E56', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  body: { flex: 1, padding: 16 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18 },
  authorAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0F6E56', alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { color: '#fff', fontWeight: '600' },
  authorName: { fontSize: 14, fontWeight: '600' },
  summary: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 16 },
  meta: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  metaItem: { alignItems: 'center', gap: 2 },
  metaLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  metaValue: { fontSize: 18, fontWeight: '700', color: '#111' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#E8F5F1', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: '#0F6E56', fontWeight: '600' },
});
