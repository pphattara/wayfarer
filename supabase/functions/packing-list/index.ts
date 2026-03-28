import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { destination, start_date, end_date, forecast } = await req.json()
  const days = Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  const weatherSummary = forecast
    .slice(0, 5)
    .map((d: { date: string; temp_min: number; temp_max: number; description: string }) =>
      `${d.date}: ${d.temp_min}–${d.temp_max}°C, ${d.description}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
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

  const packing_list = JSON.parse(response.choices[0].message.content ?? '[]')
  return new Response(JSON.stringify({ packing_list }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
