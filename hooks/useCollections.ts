// hooks/useCollections.ts
import { supabase } from '../lib/supabase'
import type { Collection, Place } from '../types'

export function useCollections() {
  async function getCollections(): Promise<Collection[]> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user!.id)
    if (error) throw error
    return data as Collection[]
  }

  async function createCollection(name: string): Promise<Collection> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('collections')
      .insert({ name, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as Collection
  }

  async function saveToCollection(collectionId: string, place: Omit<Place, 'id' | 'created_by'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()

    // Upsert place
    const { data: placeData, error: placeError } = await supabase
      .from('places')
      .upsert({ ...place, created_by: user!.id }, { onConflict: 'mapbox_id' })
      .select()
      .single()
    if (placeError) throw placeError

    // Add to collection (ignore duplicate)
    await supabase
      .from('collection_places')
      .insert({ collection_id: collectionId, place_id: placeData.id })
      .throwOnError()
  }

  return { getCollections, createCollection, saveToCollection }
}
