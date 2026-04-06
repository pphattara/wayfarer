import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openai = new OpenAI({
  apiKey: Deno.env.get('GROQ_API_KEY')!,
  baseURL: 'https://api.groq.com/openai/v1',
})
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { destination } = await req.json()

  if (!destination) {
    return new Response(
      JSON.stringify({ error: 'destination is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check cache first (7-day TTL)
  const { data: cached } = await supabase
    .from('best_time_cache')
    .select('content, cached_at')
    .eq('destination', destination)
    .single()

  if (cached) {
    const ageMs = Date.now() - new Date(cached.cached_at).getTime()
    if (ageMs < 7 * 24 * 60 * 60 * 1000) {
      return new Response(JSON.stringify(cached.content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const response = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Analyse the best time to visit ${destination} for tourists.
Return a JSON object:
{
  "destination": string,
  "optimal_months": string[],
  "summary": string (2-3 sentences),
  "monthly_breakdown": [
    { "month": string, "weather": string, "crowd_level": "low"|"medium"|"high", "cost_index": "low"|"medium"|"high", "score": number (1-10) }
  ]
}
Return only valid JSON, no markdown.`
    }],
    max_tokens: 1500,
  })

  let content: Record<string, unknown>
  try {
    const raw = response.choices[0].message.content ?? '{}'
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    content = JSON.parse(cleaned)
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Upsert cache
  await supabase.from('best_time_cache').upsert({
    destination,
    content,
    cached_at: new Date().toISOString(),
  }, { onConflict: 'destination' })

  return new Response(JSON.stringify(content), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
