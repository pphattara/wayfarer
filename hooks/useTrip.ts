// hooks/useTrip.ts
import { supabase } from '../lib/supabase'
import type { Trip, ItineraryDay } from '../types'

export function useTrip() {
  async function createTrip(params: {
    trip_name?: string
    origin: string
    destinations: string[]
    start_date: string
    end_date: string
  }): Promise<Trip> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('trips')
      .insert({ ...params, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data as Trip
  }

  async function saveItinerary(tripId: string, days: ItineraryDay[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from('itinerary_days').delete().eq('trip_id', tripId)
    if (deleteError) throw deleteError

    const rows = days.map(d => ({
      trip_id: tripId,
      day_number: d.day_number,
      date: d.date,
      items: d.items,
    }))
    const { error } = await supabase.from('itinerary_days').insert(rows)
    if (error) throw error
  }

  async function deleteTrip(tripId: string): Promise<void> {
    const { error } = await supabase.from('trips').delete().eq('id', tripId)
    if (error) throw error
  }

  async function updateTrip(tripId: string, params: { destinations?: string[]; start_date?: string; end_date?: string; status?: string }): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips').update(params).eq('id', tripId).select().single()
    if (error) throw error
    return data as Trip
  }

  async function getUserTrips(): Promise<Trip[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Trip[]
  }

  return { createTrip, saveItinerary, getUserTrips, deleteTrip, updateTrip }
}
