// hooks/useCommunityPins.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uploadMedia } from '../lib/storage';
import type { CommunityPin, CreatePinInput } from '../types/social';

export interface Bbox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export function useCommunityPins() {
  const [pins, setPins] = useState<CommunityPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPins();
  }, []);

  async function loadPins() {
    setLoading(true);
    const { data } = await supabase
      .from('community_pins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setPins((data as CommunityPin[]) ?? []);
    setLoading(false);
  }

  async function loadInViewport(bbox: Bbox) {
    const { data, error } = await supabase
      .from('community_pins')
      .select('*')
      .gte('lat', bbox.minLat)
      .lte('lat', bbox.maxLat)
      .gte('lng', bbox.minLng)
      .lte('lng', bbox.maxLng)
      .limit(100);
    if (!error && data) setPins(data as CommunityPin[]);
  }

  const addPin = useCallback(async (input: CreatePinInput): Promise<CommunityPin | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    let photoUrl: string | null = null;
    if (input.photoUri) {
      photoUrl = await uploadMedia(userData.user.id, input.photoUri, 'image/jpeg');
    }

    const { data, error } = await supabase
      .from('community_pins')
      .insert({
        user_id: userData.user.id,
        lat: input.lat,
        lng: input.lng,
        name: input.name,
        category: input.category,
        note: input.note ?? null,
        photo_url: photoUrl,
      })
      .select()
      .single();

    if (error) return null;
    const newPin = data as CommunityPin;
    setPins((prev) => [newPin, ...prev]);
    return newPin;
  }, []);

  const deletePin = useCallback(async (pinId: string) => {
    const { error } = await supabase.from('community_pins').delete().eq('id', pinId);
    if (!error) setPins((prev) => prev.filter((p) => p.id !== pinId));
  }, []);

  return { pins, loading, addPin, deletePin, refresh: loadPins, loadInViewport };
}
