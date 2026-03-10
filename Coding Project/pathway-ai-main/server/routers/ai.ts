import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { aiConversations, aiPathways, chanceEvaluations, studentProfiles, universities } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { callGroq } from "../lib/groq";

export const aiRouter = router({
  chat: protectedProcedure
    .input(z.object({
      conversationId: z.number().optional(),
      message: z.string().min(1).max(4000),
      contextType: z.enum(["general", "essay", "interview", "university", "visa", "scholarship"]).default("general"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const systemPrompt = `You are PathwayAI Counselor, an expert university admissions advisor specializing in US and UK universities. You help international students navigate the admissions process with personalized, accurate, and encouraging guidance.

Your expertise includes:
- US university admissions (Common App, Coalition App, direct applications)
- UK university admissions (UCAS, personal statements, Oxford/Cambridge)
- Graduate admissions (masters, MBA, PhD)
- Test preparation (SAT, ACT, GRE, GMAT, TOEFL, IELTS)
- Essay writing and personal statement coaching
- Scholarship and financial aid guidance
- Student visa processes (F-1, Tier 4)
- Interview preparation

Always be encouraging, specific, and actionable. When discussing specific universities, mention their unique characteristics. Provide data-driven insights when possible.`;

      let conversation: { id: number; messages: Array<{ role: string; content: string; timestamp: number }> } | null = null;

      if (input.conversationId) {
        const rows = await db.select().from(aiConversations)
          .where(and(eq(aiConversations.id, input.conversationId), eq(aiConversations.userId, ctx.user.id)))
          .limit(1);
        if (rows[0]) {
          conversation = { id: rows[0].id, messages: (rows[0].messages as any[]) ?? [] };
        }
      }

      const history = conversation?.messages ?? [];
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input.message },
      ];

      let reply: string;
      try {
        reply = await callGroq(messages);
      } catch (err: any) {
        if (err.message === "RATE_LIMIT") throw new Error("Our AI is busy, please try again in a moment");
        throw err;
      }

      const newMessages = [
        ...history,
        { role: "user", content: input.message, timestamp: Date.now() },
        { role: "assistant", content: reply, timestamp: Date.now() },
      ];

      if (conversation) {
        await db.update(aiConversations).set({ messages: newMessages }).where(eq(aiConversations.id, conversation.id));
        return { conversationId: conversation.id, reply };
      } else {
        const title = input.message.slice(0, 60) + (input.message.length > 60 ? "..." : "");
        const result = await db.insert(aiConversations).values({
          userId: ctx.user.id,
          contextType: input.contextType,
          title,
          messages: newMessages,
        });
        return { conversationId: (result as any).insertId, reply };
      }
    }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: aiConversations.id,
      title: aiConversations.title,
      contextType: aiConversations.contextType,
      createdAt: aiConversations.createdAt,
      updatedAt: aiConversations.updatedAt,
    }).from(aiConversations).where(eq(aiConversations.userId, ctx.user.id));
    return rows;
  }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(aiConversations)
        .where(and(eq(aiConversations.id, input.id), eq(aiConversations.userId, ctx.user.id)))
        .limit(1);
      return rows[0] ?? null;
    }),

  generatePathway: protectedProcedure
    .input(z.object({ force: z.boolean().optional().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Return cached pathway unless force refresh
      if (!input.force) {
        const cached = await db
          .select()
          .from(aiPathways)
          .where(eq(aiPathways.userId, ctx.user.id))
          .limit(1);
        if (cached[0]) {
          return {
            safety: cached[0].safety,
            target: cached[0].target,
            reach: cached[0].reach,
            cached: true,
          };
        }
      }

      const profileRows = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, ctx.user.id))
        .limit(1);
      const p = profileRows[0];
      if (!p) throw new Error("Complete your profile first to generate a pathway.");

      const countries = Array.isArray(p.targetCountries) ? p.targetCountries.join(", ") : "Not specified";
      const budget =
        p.budgetMin && p.budgetMax
          ? `$${p.budgetMin.toLocaleString()}–$${p.budgetMax.toLocaleString()}/yr`
          : "Not specified";

      const systemPrompt = `You are a university admissions expert. Based on the student's profile below, generate a personalised university pathway with exactly 9 universities:
- 3 Safety schools (80-95% admission chance)
- 3 Target schools (40-70% admission chance)
- 3 Reach schools (10-30% admission chance)

Student Profile:
- Nationality: ${p.nationality ?? "Not specified"}
- Education: ${p.educationLevel ?? "Not specified"}, GPA: ${p.gpa ?? "N/A"}/${p.gpaScale ?? "4.0"}
- Test scores: SAT ${p.satScore ?? "N/A"}, GRE ${p.greScore ?? "N/A"}, GMAT ${p.gmatScore ?? "N/A"}, IELTS ${p.ieltsScore ?? "N/A"}, TOEFL ${p.toeflScore ?? "N/A"}
- Intended major: ${p.intendedMajor ?? "Not specified"}
- Work experience: ${p.workExperienceYears ?? 0} years
- Target degree: ${p.targetLevel ?? "Not specified"}
- Preferred countries: ${countries}
- Budget range: ${budget}

Respond ONLY in this JSON format:
{
  "safety": [
    {
      "name": "University Name",
      "country": "US",
      "program": "Specific program name",
      "admissionChance": 85,
      "reasoning": "One sentence why this is a safety school for this student",
      "deadline": "Month Year",
      "tuition": "$X,000/yr"
    }
  ],
  "target": [...same format, 3 universities],
  "reach": [...same format, 3 universities]
}

Only recommend real universities with real programs. Be honest about chances.`;

      let content: string;
      try {
        content = await callGroq([{ role: "user", content: systemPrompt }], true);
      } catch (err: any) {
        if (err.message === "RATE_LIMIT") throw new Error("Our AI is busy, please try again in a moment");
        throw err;
      }

      const parsed = JSON.parse(content) as {
        safety: any[];
        target: any[];
        reach: any[];
      };

      // Upsert — one record per user
      const existing = await db
        .select({ id: aiPathways.id })
        .from(aiPathways)
        .where(eq(aiPathways.userId, ctx.user.id))
        .limit(1);

      if (existing[0]) {
        await db
          .update(aiPathways)
          .set({ safety: parsed.safety, target: parsed.target, reach: parsed.reach })
          .where(eq(aiPathways.id, existing[0].id));
      } else {
        await db.insert(aiPathways).values({
          userId: ctx.user.id,
          safety: parsed.safety,
          target: parsed.target,
          reach: parsed.reach,
        });
      }

      return { ...parsed, cached: false };
    }),

  getSavedPathway: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(aiPathways)
      .where(eq(aiPathways.userId, ctx.user.id))
      .limit(1);
    return rows[0] ?? null;
  }),

  predictChance: protectedProcedure
    .input(z.object({ universityId: z.number(), programId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [profileRows, uniRows] = await Promise.all([
        db.select().from(studentProfiles).where(eq(studentProfiles.userId, ctx.user.id)).limit(1),
        db.select().from(universities).where(eq(universities.id, input.universityId)).limit(1),
      ]);

      const profile = profileRows[0];
      const uni = uniRows[0];
      if (!uni) throw new Error("University not found");

      const systemPrompt = `You are an expert admissions analyst. Evaluate this student's admission chances for the specific university and program requested.

Student Profile:
- Nationality: ${profile?.nationality ?? "Not specified"}
- Education: ${profile?.educationLevel ?? "Not specified"}, GPA: ${profile?.gpa ?? "N/A"}/${profile?.gpaScale ?? "4.0"}
- Test scores: SAT ${profile?.satScore ?? "N/A"}, GRE ${profile?.greScore ?? "N/A"}, GMAT ${profile?.gmatScore ?? "N/A"}, IELTS ${profile?.ieltsScore ?? "N/A"}, TOEFL ${profile?.toeflScore ?? "N/A"}
- Intended major: ${profile?.intendedMajor ?? "Not specified"}
- Work experience: ${profile?.workExperienceYears ?? 0} years

Target: ${uni.name} (${uni.country}) — ${profile?.intendedMajor ?? "General program"}
University acceptance rate: ${uni.acceptanceRate ?? "N/A"}%
University avg GPA: ${uni.avgGpa ?? "N/A"}
University avg SAT: ${uni.avgSat ?? "N/A"}

Respond ONLY in this JSON format:
{
  "chance": 72,
  "verdict": "Good Match",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "tips": ["actionable tip 1", "actionable tip 2"],
  "summary": "Two sentence personalised summary of their chances."
}

verdict must be one of: "Good Match", "Reach", "Safety", "Likely Reach"
Base the percentage on real admission statistics. Be honest.`;

      let content: string;
      try {
        content = await callGroq([{ role: "user", content: systemPrompt }], true);
      } catch (err: any) {
        if (err.message === "RATE_LIMIT") throw new Error("Our AI is busy, please try again in a moment");
        throw err;
      }

      const result = JSON.parse(content);

      await db.insert(chanceEvaluations).values({
        userId: ctx.user.id,
        universityId: input.universityId,
        programId: input.programId,
        inputSnapshot: profile ?? {},
        predictedScore: String(result.chance ?? result.predictedScore ?? 0),
        category:
          result.verdict === "Safety"
            ? "safety"
            : result.verdict === "Reach" || result.verdict === "Likely Reach"
            ? "reach"
            : "target",
        explanation: result.summary ?? result.explanation ?? "",
        strengths: result.strengths ?? [],
        weaknesses: result.weaknesses ?? [],
      });

      return result;
    }),

  getChanceHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(chanceEvaluations).where(eq(chanceEvaluations.userId, ctx.user.id));
    if (rows.length === 0) return [];
    const uniIds = Array.from(new Set(rows.map((r) => r.universityId)));
    const unis = await db.select().from(universities).where(
      uniIds.length === 1
        ? eq(universities.id, uniIds[0])
        : eq(universities.id, uniIds[0])
    );
    const uniMap = Object.fromEntries(unis.map((u) => [u.id, u]));
    return rows.map((r) => ({ ...r, university: uniMap[r.universityId] ?? null }));
  }),
});
