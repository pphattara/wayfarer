// types/index.ts

export type TripStatus = 'planning' | 'confirmed' | 'completed'

export interface User {
  id: string
  email: string
  nationality: string
  display_name: string
  avatar_url: string | null
}

export interface Trip {
  id: string
  user_id: string
  origin: string
  destinations: string[]
  start_date: string        // ISO date string YYYY-MM-DD
  end_date: string
  status: TripStatus
  created_at: string
}

export interface ItineraryDay {
  id: string
  trip_id: string
  day_number: number
  date: string
  items: ItineraryItem[]
}

export interface ItineraryItem {
  place: string
  time: string
  notes: string
  duration_minutes?: number
}

export interface VisaSummary {
  id: string
  trip_id: string
  nationality: string
  destination: string
  visa_type: string
  steps: string[]
  timeline: string
  checklist: string[]
  cost_estimate: string
  embassy_url: string
  generated_at: string
}

export interface WeatherPack {
  id: string
  trip_id: string
  forecast: WeatherForecastDay[]
  packing_list: PackingCategory[]
  fetched_at: string
}

export interface WeatherForecastDay {
  date: string
  temp_min: number
  temp_max: number
  description: string
  icon: string
}

export interface PackingCategory {
  category: string
  items: string[]
}

export interface BestTimeResult {
  destination: string
  optimal_months: string[]
  summary: string
  monthly_breakdown: MonthData[]
  cached_at: string
}

export interface MonthData {
  month: string
  weather: string
  crowd_level: 'low' | 'medium' | 'high'
  cost_index: 'low' | 'medium' | 'high'
  score: number
}

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  mapbox_id: string | null
  category: string
  created_by: string | null
}

export interface Collection {
  id: string
  user_id: string
  name: string
}
