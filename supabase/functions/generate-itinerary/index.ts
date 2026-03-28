import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { origin, destinations, start_date, end_date, interests } = await req.json()

  const days = Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [{
      role: 'system',
      content: 'You are a professional travel planner. Generate detailed, practical itineraries with real places, opening hours, and travel times.',
    }, {
      role: 'user',
      content: `Plan a ${days}-day trip from ${origin} to ${destinations.join(', ')}.
Travel dates: ${start_date} to ${end_date}.
Interests: ${interests.join(', ')}.

Return a JSON array of day objects. Each day:
{
  "day_number": number,
  "date": "YYYY-MM-DD",
  "items": [
    { "place": string, "time": "HH:MM", "notes": string, "duration_minutes": number }
  ]
}

Return only valid JSON array, no markdown.`,
    }],
    max_tokens: 3000,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
})
