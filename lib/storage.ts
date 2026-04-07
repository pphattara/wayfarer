// lib/storage.ts
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const BUCKET = 'post-media';

export function mediaPathForUser(userId: string, filename: string): string {
  const clean = filename.startsWith('/') ? filename.slice(1) : filename;
  return `${userId}/${clean}`;
}

export function getPublicUrl(storagePath: string): string {
  const result = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return result?.data?.publicUrl ?? '';
}

/**
 * Upload a local file URI to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadMedia(
  userId: string,
  localUri: string,
  contentType: 'image/jpeg' | 'image/png' | 'video/mp4'
): Promise<string> {
  const ext = contentType === 'video/mp4' ? 'mp4' : contentType === 'image/png' ? 'png' : 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const storagePath = mediaPathForUser(userId, filename);

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64',
  });
  const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType, upsert: false });

  if (error) throw new Error(error.message);

  return getPublicUrl(storagePath);
}

/**
 * Upload multiple media items. Returns array of public URLs in the same order.
 */
export async function uploadMediaBatch(
  userId: string,
  items: { uri: string; contentType: 'image/jpeg' | 'image/png' | 'video/mp4' }[]
): Promise<string[]> {
  return Promise.all(items.map(({ uri, contentType }) => uploadMedia(userId, uri, contentType)));
}
