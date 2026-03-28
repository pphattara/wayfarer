// lib/openweather.ts
import type { WeatherForecastDay } from '../types'

const BASE = 'https://api.openweathermap.org/data/2.5'

export async function fetchForecast(
  destination: string,
  _startDate: string,
  _endDate: string
): Promise<WeatherForecastDay[]> {
  const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY
  const res = await fetch(
    `${BASE}/forecast?q=${encodeURIComponent(destination)}&appid=${apiKey}&units=metric&cnt=40`
  )
  if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`)
  const data = await res.json()

  const days: WeatherForecastDay[] = data.list
    .filter((item: any) => item.dt_txt.includes('12:00:00'))
    .map((item: any) => ({
      date: item.dt_txt.split(' ')[0],
      temp_min: Math.round(item.main.temp_min),
      temp_max: Math.round(item.main.temp_max),
      description: item.weather[0].description,
      icon: item.weather[0].icon,
    }))

  return days
}
