import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { nationality, destination } = await req.json()

  if (!nationality || !destination) {
    return new Response(
      JSON.stringify({ error: 'nationality and destination are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'system',
      content: 'You are a travel visa expert. Provide accurate, practical visa guidance. Always recommend verifying with the official embassy.',
    }, {
      role: 'user',
      content: `Visa requirements for a ${nationality} passport holder visiting ${destination}.
Return JSON:
{
  "visa_type": string (e.g. "Schengen Visa", "Visa on Arrival", "Visa Free"),
  "steps": string[] (ordered application steps),
  "timeline": string (e.g. "Apply at least 3 months before travel"),
  "checklist": string[] (required documents),
  "cost_estimate": string (e.g. "€80 / ~3,500 THB"),
  "embassy_url": string (official embassy or government URL for ${nationality} citizens applying for ${destination})
}
Return only valid JSON, no markdown.`
    }],
    max_tokens: 1000,
  })

  let content: Record<string, unknown>
  try {
    content = JSON.parse(response.choices[0].message.content ?? '{}')
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  return new Response(JSON.stringify(content), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
