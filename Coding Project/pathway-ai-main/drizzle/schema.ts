import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "starter", "pro", "premium"]).default("free").notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const studentProfiles = mysqlTable("student_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nationality: varchar("nationality", { length: 100 }),
  currentCountry: varchar("currentCountry", { length: 100 }),
  educationLevel: mysqlEnum("educationLevel", ["high_school", "bachelors", "masters", "working_professional"]),
  gpa: decimal("gpa", { precision: 4, scale: 2 }),
  gpaScale: mysqlEnum("gpaScale", ["4.0", "10.0", "100", "letter"]).default("4.0"),
  gpaNormalized: decimal("gpaNormalized", { precision: 4, scale: 2 }),
  satScore: int("satScore"),
  actScore: int("actScore"),
  greScore: int("greScore"),
  gmatScore: int("gmatScore"),
  toeflScore: int("toeflScore"),
  ieltsScore: decimal("ieltsScore", { precision: 3, scale: 1 }),
  workExperienceYears: int("workExperienceYears").default(0),
  targetLevel: mysqlEnum("targetLevel", ["undergraduate", "masters", "mba"]),
  targetCountries: json("targetCountries").$type<string[]>(),
  targetStartYear: int("targetStartYear"),
  intendedMajor: varchar("intendedMajor", { length: 200 }),
  budgetMin: int("budgetMin"),
  budgetMax: int("budgetMax"),
  preferredSize: mysqlEnum("preferredSize", ["small", "medium", "large", "any"]).default("any"),
  preferredType: mysqlEnum("preferredType", ["public", "private", "any"]).default("any"),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentProfile = typeof studentProfiles.$inferSelect;

export const extracurriculars = mysqlTable("extracurriculars", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  category: mysqlEnum("category", ["leadership", "community_service", "sports", "arts", "academic", "work", "research", "other"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  organization: varchar("organization", { length: 200 }),
  description: text("description"),
  startDate: varchar("startDate", { length: 20 }),
  endDate: varchar("endDate", { length: 20 }),
  hoursPerWeek: int("hoursPerWeek"),
  aiImpactScore: decimal("aiImpactScore", { precision: 3, scale: 1 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const universities = mysqlTable("universities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  shortName: varchar("shortName", { length: 100 }),
  country: mysqlEnum("country", ["US", "UK"]).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  rankingUsNews: int("rankingUsNews"),
  rankingQs: int("rankingQs"),
  rankingThe: int("rankingThe"),
  type: mysqlEnum("type", ["public", "private"]).notNull(),
  size: mysqlEnum("size", ["small", "medium", "large"]).notNull(),
  acceptanceRate: decimal("acceptanceRate", { precision: 5, scale: 2 }),
  avgGpa: decimal("avgGpa", { precision: 4, scale: 2 }),
  avgSat: int("avgSat"),
  avgAct: int("avgAct"),
  avgGre: int("avgGre"),
  avgGmat: int("avgGmat"),
  tuitionDomestic: int("tuitionDomestic"),
  tuitionInternational: int("tuitionInternational"),
  costOfLiving: int("costOfLiving"),
  financialAidAvailable: boolean("financialAidAvailable").default(true),
  applicationSystem: mysqlEnum("applicationSystem", ["common_app", "ucas", "coalition", "direct"]).default("common_app"),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  logoUrl: varchar("logoUrl", { length: 500 }),
  description: text("description"),
  notableAlumni: json("notableAlumni").$type<string[]>(),
  strengths: json("strengths").$type<string[]>(),
  campusLife: text("campusLife"),
  researchOutput: text("researchOutput"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type University = typeof universities.$inferSelect;

export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  universityId: int("universityId").notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  level: mysqlEnum("level", ["undergraduate", "masters", "mba", "phd"]).notNull(),
  department: varchar("department", { length: 200 }),
  durationMonths: int("durationMonths"),
  deliveryMode: mysqlEnum("deliveryMode", ["on_campus", "online", "hybrid"]).default("on_campus"),
  greRequired: boolean("greRequired").default(false),
  gmatRequired: boolean("gmatRequired").default(false),
  applicationDeadlineEarly: varchar("applicationDeadlineEarly", { length: 50 }),
  applicationDeadlineRegular: varchar("applicationDeadlineRegular", { length: 50 }),
  ucasDeadline: varchar("ucasDeadline", { length: 50 }),
  specificRequirements: json("specificRequirements"),
  avgClassSize: int("avgClassSize"),
  employmentRate: decimal("employmentRate", { precision: 5, scale: 2 }),
  avgStartingSalary: int("avgStartingSalary"),
  tuitionTotal: int("tuitionTotal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const savedUniversities = mysqlTable("saved_universities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  universityId: int("universityId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  universityId: int("universityId").notNull(),
  programId: int("programId"),
  status: mysqlEnum("status", ["researching", "in_progress", "submitted", "interview", "waitlisted", "accepted", "rejected", "enrolled"]).default("researching").notNull(),
  applicationRound: mysqlEnum("applicationRound", ["EA", "ED", "ED2", "RD", "rolling", "R1", "R2", "R3"]),
  submittedDate: timestamp("submittedDate"),
  decisionDate: timestamp("decisionDate"),
  chanceScore: decimal("chanceScore", { precision: 5, scale: 2 }),
  category: mysqlEnum("category", ["safety", "target", "reach"]),
  notes: text("notes"),
  priority: int("priority").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;

export const applicationDocuments = mysqlTable("application_documents", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  documentType: mysqlEnum("documentType", ["transcript", "essay", "recommendation", "resume", "test_score", "portfolio", "financial", "other"]).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  status: mysqlEnum("status", ["not_started", "in_progress", "completed", "submitted"]).default("not_started").notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }),
  fileKey: varchar("fileKey", { length: 500 }),
  dueDate: timestamp("dueDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const essays = mysqlTable("essays", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  applicationId: int("applicationId"),
  title: varchar("title", { length: 300 }).notNull(),
  prompt: text("prompt"),
  promptType: mysqlEnum("promptType", ["personal_statement", "why_school", "goals", "diversity", "activity", "additional_info", "sop", "other"]).default("personal_statement"),
  content: text("content"),
  wordLimit: int("wordLimit"),
  currentWordCount: int("currentWordCount").default(0),
  aiScore: decimal("aiScore", { precision: 3, scale: 1 }),
  aiFeedback: json("aiFeedback"),
  version: int("version").default(1),
  status: mysqlEnum("status", ["draft", "review", "final"]).default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Essay = typeof essays.$inferSelect;

export const essayVersions = mysqlTable("essay_versions", {
  id: int("id").autoincrement().primaryKey(),
  essayId: int("essayId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  content: text("content"),
  aiFeedback: json("aiFeedback"),
  aiScore: decimal("aiScore", { precision: 3, scale: 1 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const scholarships = mysqlTable("scholarships", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  provider: mysqlEnum("provider", ["university", "government", "private", "foundation"]).notNull(),
  universityId: int("universityId"),
  country: mysqlEnum("country", ["US", "UK", "both", "international"]).notNull(),
  amountMin: int("amountMin"),
  amountMax: int("amountMax"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  eligibilityCriteria: json("eligibilityCriteria"),
  deadline: varchar("deadline", { length: 100 }),
  url: varchar("url", { length: 500 }),
  renewable: boolean("renewable").default(false),
  description: text("description"),
  targetLevel: mysqlEnum("targetLevel", ["undergraduate", "masters", "mba", "all"]).default("all"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Scholarship = typeof scholarships.$inferSelect;

export const aiConversations = mysqlTable("ai_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contextType: mysqlEnum("contextType", ["general", "essay", "interview", "university", "visa", "scholarship"]).default("general"),
  contextId: int("contextId"),
  title: varchar("title", { length: 300 }),
  messages: json("messages").$type<Array<{ role: string; content: string; timestamp: number }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const interviewSessions = mysqlTable("interview_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  universityId: int("universityId"),
  interviewType: mysqlEnum("interviewType", ["behavioral", "case", "oxford_tutorial", "general", "technical"]).default("behavioral"),
  mode: mysqlEnum("mode", ["text", "voice"]).default("text"),
  status: mysqlEnum("status", ["in_progress", "completed"]).default("in_progress"),
  questions: json("questions").$type<Array<{ question: string; answer?: string; feedback?: string; score?: number }>>(),
  overallScore: decimal("overallScore", { precision: 3, scale: 1 }),
  overallFeedback: text("overallFeedback"),
  durationMinutes: int("durationMinutes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chanceEvaluations = mysqlTable("chance_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  universityId: int("universityId").notNull(),
  programId: int("programId"),
  inputSnapshot: json("inputSnapshot"),
  predictedScore: decimal("predictedScore", { precision: 5, scale: 2 }),
  category: mysqlEnum("category", ["safety", "target", "reach"]),
  explanation: text("explanation"),
  strengths: json("strengths").$type<string[]>(),
  weaknesses: json("weaknesses").$type<string[]>(),
  modelVersion: varchar("modelVersion", { length: 50 }).default("v1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  applicationId: int("applicationId"),
  universityId: int("universityId"),
  name: varchar("name", { length: 300 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  sizeBytes: int("sizeBytes"),
  category: mysqlEnum("category", ["transcript", "essay", "recommendation", "resume", "test_score", "portfolio", "financial", "visa", "other"]).default("other"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["deadline", "document", "interview", "decision", "scholarship", "system"]).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  message: text("message"),
  read: boolean("read").default(false),
  relatedId: int("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  scheduledFor: timestamp("scheduledFor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

export type AiPathwayUniversity = {
  name: string;
  country: "US" | "UK";
  program: string;
  admissionChance: number;
  reasoning: string;
  deadline: string;
  tuition: string;
};

export const aiPathways = mysqlTable("ai_pathways", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  safety: json("safety").$type<AiPathwayUniversity[]>().notNull(),
  target: json("target").$type<AiPathwayUniversity[]>().notNull(),
  reach: json("reach").$type<AiPathwayUniversity[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiPathway = typeof aiPathways.$inferSelect;
