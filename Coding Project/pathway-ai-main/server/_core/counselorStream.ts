import type { Express, Request, Response } from "express";
import { sdk } from "./sdk";
import { groq, GROQ_MODEL } from "../lib/groq";
import { getDb } from "../db";
import { aiConversations, studentProfiles } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

function buildCounselorSystemPrompt(profile: any): string {
  const p = profile ?? {};
  const countries = Array.isArray(p.targetCountries) ? p.targetCountries.join(", ") : "Not specified";
  const budget =
    p.budgetMin && p.budgetMax
      ? `$${p.budgetMin.toLocaleString()}–$${p.budgetMax.toLocaleString()}/yr`
      : "Not specified";

  return `You are PathwayAI's expert university admissions counselor with 15+ years of experience helping international students get into top US and UK universities.

You have deep knowledge of:
- US admissions (Common App, SAT/ACT, GPA, extracurriculars, essays)
- UK admissions (UCAS, personal statements, A-levels, clearing)
- Visa processes (US F-1, UK Student Route)
- Scholarships for international students
- Application timelines and deadlines

The student's profile:
- Nationality: ${p.nationality ?? "Not specified"}
- Education: ${p.educationLevel ?? "Not specified"}, GPA: ${p.gpa ?? "Not specified"}/${p.gpaScale ?? "4.0"}
- Test scores: SAT ${p.satScore ?? "N/A"}, IELTS ${p.ieltsScore ?? "N/A"}, GMAT ${p.gmatScore ?? "N/A"}, GRE ${p.greScore ?? "N/A"}, TOEFL ${p.toeflScore ?? "N/A"}
- Field of study: ${p.intendedMajor ?? "Not specified"}
- Work experience: ${p.workExperienceYears ?? 0} years
- Target countries: ${countries}
- Budget: ${budget}

Be specific, practical, and encouraging. Give concrete advice with examples. Keep responses concise (under 200 words) unless the question needs detail. Always end with one actionable next step.`;
}

export function registerCounselorStreamRoute(app: Express) {
  app.post("/api/counselor/stream", async (req: Request, res: Response) => {
    // Authenticate
    let user: any;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { message, conversationId } = req.body as {
      message: string;
      conversationId?: number;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "Message required" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    // Load student profile for system prompt
    const profileRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, user.id))
      .limit(1);
    const profile = profileRows[0];
    const systemPrompt = buildCounselorSystemPrompt(profile);

    // Load conversation history
    let history: Array<{ role: string; content: string; timestamp: number }> = [];
    let existingConvId: number | undefined = conversationId;

    if (conversationId) {
      const convRows = await db
        .select()
        .from(aiConversations)
        .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, user.id)))
        .limit(1);
      if (convRows[0]) {
        history = (convRows[0].messages as any[]) ?? [];
      }
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    let fullReply = "";

    try {
      const stream = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content) {
          fullReply += content;
          res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
        }
      }

      // Save conversation to DB
      const newMessages = [
        ...history,
        { role: "user", content: message, timestamp: Date.now() },
        { role: "assistant", content: fullReply, timestamp: Date.now() },
      ];

      if (existingConvId) {
        await db
          .update(aiConversations)
          .set({ messages: newMessages })
          .where(eq(aiConversations.id, existingConvId));
      } else {
        const title = message.slice(0, 60) + (message.length > 60 ? "..." : "");
        const result = await db.insert(aiConversations).values({
          userId: user.id,
          contextType: "general",
          title,
          messages: newMessages,
        });
        existingConvId = (result as any).insertId;
      }

      res.write(`data: ${JSON.stringify({ type: "done", conversationId: existingConvId })}\n\n`);
      res.end();
    } catch (err: any) {
      const errorMsg =
        err?.status === 429
          ? "Our AI is busy, please try again in a moment"
          : "AI service unavailable";
      res.write(`data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`);
      res.end();
    }
  });
}
