// components/CommunityPinModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { CommunityPin, CreatePinInput } from '../types/social';

const PIN_CATEGORIES = ['food', 'accommodation', 'attraction', 'transport', 'nature', 'general'];

interface CommunityPinModalProps {
  visible: boolean;
  lat: number;
  lng: number;
  existingPin?: CommunityPin | null;
  onClose: () => void;
  onSubmit: (input: CreatePinInput) => Promise<void>;
}

export function CommunityPinModal({
  visible,
  lat,
  lng,
  existingPin,
  onClose,
  onSubmit,
}: CommunityPinModalProps) {
  const [name, setName] = useState(existingPin?.name ?? '');
  const [category, setCategory] = useState(existingPin?.category ?? 'general');
  const [note, setNote] = useState(existingPin?.note ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSubmitting(true);
    await onSubmit({ lat, lng, name: name.trim(), category, note: note.trim() || undefined, photoUri: photoUri ?? undefined });
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close pin modal" accessibilityRole="button">
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{existingPin ? 'Pin Details' : 'Add Pin'}</Text>
          {!existingPin && (
            <TouchableOpacity onPress={submit} disabled={submitting} accessibilityLabel="Add community pin" accessibilityRole="button">
              <Text style={[styles.postBtn, submitting && { opacity: 0.4 }]}>Save</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.body}>
          {existingPin?.photo_url ? (
            <Image source={{ uri: existingPin.photo_url }} style={styles.photo} />
          ) : null}

          {!existingPin && (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hidden ramen spot"
                value={name}
                onChangeText={setName}
                accessibilityLabel="Pin name"
              />

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {PIN_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, category === c && styles.chipActive]}
                    onPress={() => setCategory(c)}
                    accessibilityLabel={`Category ${c}`}
                  >
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder="e.g. Cash only, open till 11pm"
                multiline
                value={note}
                onChangeText={setNote}
                accessibilityLabel="Pin note"
              />

              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} accessibilityLabel="Add photo">
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>+ Add photo</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {existingPin && (
            <>
              <Text style={styles.pinName}>{existingPin.name}</Text>
              <Text style={styles.pinCategory}>{existingPin.category}</Text>
              {existingPin.note ? <Text style={styles.pinNote}>{existingPin.note}</Text> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd',
  },
  title: { fontSize: 17, fontWeight: '600' },
  cancelBtn: { fontSize: 17, color: '#666' },
  postBtn: { fontSize: 17, fontWeight: '600', color: '#0F6E56' },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', marginRight: 8,
  },
  chipActive: { borderColor: '#0F6E56', backgroundColor: '#E8F5F1' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#0F6E56', fontWeight: '600' },
  photoBtn: {
    marginTop: 16, borderWidth: 1, borderColor: '#0F6E56', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  photoBtnText: { color: '#0F6E56', fontWeight: '600' },
  photoPreview: { width: '100%', height: 200, borderRadius: 10 },
  photo: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  pinName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pinCategory: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 8, textTransform: 'capitalize' },
  pinNote: { fontSize: 15, color: '#444', lineHeight: 22 },
});
