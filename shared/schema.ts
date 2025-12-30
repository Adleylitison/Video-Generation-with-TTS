import { pgTable, text, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

// Replit Auth: Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Replit Auth: User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Emotion settings for TTS voice generation
export interface EmotionSettings {
  happy: number;    // 0-100
  sad: number;      // 0-100
  angry: number;    // 0-100
  fearful: number;  // 0-100
  surprised: number; // 0-100
  calm: number;     // 0-100
}

export const defaultEmotionSettings: EmotionSettings = {
  happy: 50,
  sad: 0,
  angry: 0,
  fearful: 0,
  surprised: 0,
  calm: 50,
};

// Video projects
export const videoProjects = pgTable("video_projects", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  script: text("script").notNull(),
  videoType: text("video_type").notNull().$type<"emotive" | "informative">(),
  emotions: jsonb("emotions").$type<EmotionSettings>().default(defaultEmotionSettings),
  status: text("status").notNull().$type<"draft" | "processing" | "complete" | "error">().default("draft"),
  videoUrl: text("video_url"),
  driveFileId: text("drive_file_id"),
  driveWebViewLink: text("drive_web_view_link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emotionSettingsSchema = z.object({
  happy: z.number().min(0).max(100),
  sad: z.number().min(0).max(100),
  angry: z.number().min(0).max(100),
  fearful: z.number().min(0).max(100),
  surprised: z.number().min(0).max(100),
  calm: z.number().min(0).max(100),
});

export const insertVideoProjectSchema = createInsertSchema(videoProjects).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  script: z.string().min(10, "Script must be at least 10 characters"),
  videoType: z.enum(["emotive", "informative"]),
  emotions: emotionSettingsSchema.optional(),
});

export type InsertVideoProject = z.infer<typeof insertVideoProjectSchema>;
export type VideoProject = typeof videoProjects.$inferSelect;

// Processing stages for real-time status updates
export type ProcessingStage = 
  | "analyzing"
  | "generating_tts"
  | "generating_music"
  | "generating_video"
  | "composing"
  | "complete"
  | "error";

export interface ProcessingStatus {
  projectId: string;
  stage: ProcessingStage;
  progress: number; // 0-100
  currentStep: string;
  error?: string;
}

// API configuration (stored client-side)
export interface ApiConfiguration {
  soraApiKey: string;
  geminiApiKey: string;
  pipecatApiKey: string;
}
