// components/ShareTripModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { uploadMediaBatch } from '../lib/storage';
import type { Post } from '../types/social';

interface ShareTripModalProps {
  visible: boolean;
  tripId: string;
  destinationName?: string;
  destinationLat?: number;
  destinationLng?: number;
  onClose: () => void;
  onPosted: (post: Post) => void;
}

export function ShareTripModal({
  visible,
  tripId,
  destinationName,
  destinationLat,
  destinationLng,
  onClose,
  onPosted,
}: ShareTripModalProps) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Post['visibility']>('public');
  const [mediaAssets, setMediaAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 9,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMediaAssets((prev) => [...prev, ...result.assets].slice(0, 9));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const mediaUrls = mediaAssets.length > 0
        ? await uploadMediaBatch(
            userData.user.id,
            mediaAssets.map((a) => ({
              uri: a.uri,
              contentType: (a.type === 'video' ? 'video/mp4' : 'image/jpeg') as 'video/mp4' | 'image/jpeg',
            }))
          )
        : [];

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userData.user.id,
          trip_id: tripId,
          caption,
          media_urls: mediaUrls,
          lat: destinationLat ?? null,
          lng: destinationLng ?? null,
          destination_name: destinationName || null,
          visibility,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      onPosted(data as Post);
      setCaption('');
      setMediaAssets([]);
      onClose();
    } catch (e: any) {
      Alert.alert('Could not share trip', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Cancel sharing">
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Share Trip</Text>
          <TouchableOpacity onPress={submit} disabled={submitting} accessibilityLabel="Post trip">
            {submitting ? (
              <ActivityIndicator color="#0F6E56" />
            ) : (
              <Text style={styles.postBtn}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <Text style={styles.destination}>{destinationName}</Text>

          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption…"
            multiline
            maxLength={500}
            value={caption}
            onChangeText={setCaption}
            accessibilityLabel="Trip caption"
          />

          {mediaAssets.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {mediaAssets.map((asset, i) => (
                <Image key={i} source={{ uri: asset.uri }} style={styles.mediaThumbnail} />
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.addMediaBtn} onPress={pickMedia} accessibilityLabel="Add photos or videos">
            <Text style={styles.addMediaText}>+ Add photos/videos</Text>
          </TouchableOpacity>

          <View style={styles.visibilityRow}>
            {(['public', 'followers', 'private'] as Post['visibility'][]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.visibilityChip, visibility === v && styles.visibilityChipActive]}
                onPress={() => setVisibility(v)}
                accessibilityLabel={`Set visibility to ${v}`}
              >
                <Text style={[styles.visibilityLabel, visibility === v && styles.visibilityLabelActive]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  title: { fontSize: 17, fontWeight: '600' },
  cancelBtn: { fontSize: 17, color: '#666' },
  postBtn: { fontSize: 17, fontWeight: '600', color: '#0F6E56' },
  body: { padding: 16 },
  destination: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 8 },
  captionInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#111',
    marginBottom: 16,
  },
  mediaRow: { marginBottom: 12 },
  mediaThumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  addMediaBtn: {
    borderWidth: 1,
    borderColor: '#0F6E56',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addMediaText: { color: '#0F6E56', fontWeight: '600' },
  visibilityRow: { flexDirection: 'row', gap: 8 },
  visibilityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  visibilityChipActive: { borderColor: '#0F6E56', backgroundColor: '#E8F5F1' },
  visibilityLabel: { fontSize: 13, color: '#666' },
  visibilityLabelActive: { color: '#0F6E56', fontWeight: '600' },
});
