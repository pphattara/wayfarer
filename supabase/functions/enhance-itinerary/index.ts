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
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { destination, days } = body
  if (!destination || !Array.isArray(days)) {
    return new Response(JSON.stringify({ error: 'destination and days[] are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let response
  try {
    response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      stream: false,
      messages: [{
        role: 'system',
        content: 'You are a travel planner. Enhance itineraries by adding realistic transport and improving details. Return only valid JSON, no markdown.',
      }, {
        role: 'user',
        content: `Enhance this itinerary for ${destination}:

${JSON.stringify(days, null, 2)}

For each item:
1. Add "transport_to_next": how to travel to the next stop using local transport (walk, taxi, metro, BTS, MRT, tuk-tuk, bus, etc. — use what's realistic for ${destination}). Include estimated time. Leave empty string on last item of each day.
2. If "notes" is empty, add a helpful tip (opening hours, entry fee, what to order, best photo spot, etc.)
3. If "time" is empty or "00:00", suggest a realistic time based on surrounding items.

Keep all existing data. Only improve what's missing or empty.

Return the same JSON structure. Return only the JSON array, no markdown.`,
      }],
      max_tokens: 8192,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'AI service error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const raw = response.choices[0].message.content ?? '[]'
  let enhanced: unknown[]
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    enhanced = JSON.parse(cleaned)
    if (!Array.isArray(enhanced)) enhanced = days
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse enhanced itinerary. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ days: enhanced }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
