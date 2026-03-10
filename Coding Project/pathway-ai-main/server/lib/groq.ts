import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Helper: call Groq and return the text content (non-streaming)
export async function callGroq(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  jsonMode = false
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    });
    return completion.choices[0].message.content ?? "";
  } catch (err: any) {
    if (err?.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("AI service unavailable");
  }
}
