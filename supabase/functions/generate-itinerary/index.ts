import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({
  apiKey: Deno.env.get('GROQ_API_KEY')!,
  baseURL: 'https://api.groq.com/openai/v1',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { origin, destinations, start_date, end_date, interests, flight_number, departure_time, arrival_time, checkin_time } = body

  if (!origin || !Array.isArray(destinations) || !start_date || !end_date || !Array.isArray(interests)) {
    return new Response(
      JSON.stringify({ error: 'origin, destinations[], start_date, end_date, and interests[] are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const days = Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  let response
  try {
    response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      stream: false,
      messages: [{
        role: 'system',
        content: 'You are a professional travel planner. Generate detailed, practical itineraries with real places, opening hours, and travel times. Return only valid JSON, no markdown.',
      }, {
        role: 'user',
        content: `Plan a ${days}-day trip from ${origin} to ${destinations.join(', ')}.
Travel dates: ${start_date} to ${end_date}.
Interests: ${interests.join(', ')}.
${flight_number ? `Flight: ${flight_number}.` : ''}
${departure_time ? `Departure from ${origin}: ${departure_time} — do not plan activities on day 1 before this time.` : ''}
${arrival_time ? `Arrival at ${destinations[0]}: ${arrival_time} — day 1 activities should start after arrival and airport transfer time (allow ~1-2 hours after landing).` : ''}
${checkin_time ? `Accommodation check-in: ${checkin_time} — if arrival is before check-in, suggest luggage storage options for day 1.` : ''}

Return a JSON array of day objects. Each day:
{
  "day_number": number,
  "date": "YYYY-MM-DD",
  "items": [
    {
      "place": string,
      "time": "HH:MM",
      "notes": string,
      "duration_minutes": number,
      "transport_to_next": string  // how to travel to the next stop, e.g. "Walk 8 min", "Take BTS to Asok (2 stops)", "Taxi ~15 min". Omit on the last item of each day.
    }
  ]
}

Return only the JSON array, no markdown, no explanation.`,
      }],
      max_tokens: 8192,
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? 'AI service error. Please try again.' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const raw = response.choices[0].message.content ?? '[]'
  let itinerary: unknown[]
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    itinerary = JSON.parse(cleaned)
    if (!Array.isArray(itinerary)) itinerary = []
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to parse itinerary. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify(itinerary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
