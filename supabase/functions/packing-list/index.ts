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

  const { destination, start_date, end_date, forecast } = await req.json()

  if (!Array.isArray(forecast)) {
    return new Response(
      JSON.stringify({ error: 'forecast must be an array' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  if (!start_date || !end_date) {
    return new Response(
      JSON.stringify({ error: 'start_date and end_date are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const days = Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  const weatherSummary = forecast
    .slice(0, 5)
    .map((d: { date: string; temp_min: number; temp_max: number; description: string }) =>
      `${d.date}: ${d.temp_min}–${d.temp_max}°C, ${d.description}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Create a packing list for a ${days}-day trip to ${destination}.
Weather forecast:
${weatherSummary}

Return JSON array of categories:
[
  { "category": string, "items": string[] }
]
Categories: Clothing, Shoes, Toiletries, Electronics, Documents, Health & Safety, Extras.
Return only valid JSON, no markdown.`
    }],
    max_tokens: 800,
  })

  let packing_list: unknown[]
  try {
    packing_list = JSON.parse(response.choices[0].message.content ?? '[]')
    if (!Array.isArray(packing_list)) packing_list = []
  } catch {
    packing_list = []
  }
  return new Response(JSON.stringify({ packing_list }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
