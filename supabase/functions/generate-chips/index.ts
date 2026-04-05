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

  const { destination } = await req.json()
  if (!destination) {
    return new Response(JSON.stringify({ error: 'destination required' }), { status: 400, headers: corsHeaders })
  }

  const response = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Generate exactly 12 interest category chips for a traveller visiting ${destination}.
Return a JSON array of objects with shape: { "label": string, "emoji": string }.
Categories should be specific to the destination and cover a range of interests.
Return only valid JSON, no markdown.`
    }],
    max_tokens: 500,
  })

  const raw = response.choices[0].message.content ?? '[]'
  let chips: { label: string; emoji: string }[]
  try {
    chips = JSON.parse(raw)
  } catch {
    chips = [
      { label: 'Culture', emoji: '🏛' },
      { label: 'Food', emoji: '🍜' },
      { label: 'Nature', emoji: '🏔' },
      { label: 'Shopping', emoji: '🛍' },
      { label: 'Nightlife', emoji: '🎭' },
    ]
  }

  return new Response(JSON.stringify({ chips }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
