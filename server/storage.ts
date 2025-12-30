import { type VideoProject, type InsertVideoProject, type ProcessingStatus, videoProjects, users, type User, type UpsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Video Projects
  getProject(id: string): Promise<VideoProject | undefined>;
  getAllProjects(): Promise<VideoProject[]>;
  getUserProjects(userId: string): Promise<VideoProject[]>;
  createProject(userId: string, project: InsertVideoProject): Promise<VideoProject>;
  updateProject(id: string, updates: Partial<VideoProject>): Promise<VideoProject | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Processing Status
  getProcessingStatus(projectId: string): Promise<ProcessingStatus | undefined>;
  updateProcessingStatus(status: ProcessingStatus): Promise<void>;
  deleteProcessingStatus(projectId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private processingStatuses: Map<string, ProcessingStatus>;

  constructor() {
    this.processingStatuses = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getProject(id: string): Promise<VideoProject | undefined> {
    const [project] = await db.select().from(videoProjects).where(eq(videoProjects.id, id));
    return project || undefined;
  }

  async getAllProjects(): Promise<VideoProject[]> {
    return await db.select().from(videoProjects);
  }

  async getUserProjects(userId: string): Promise<VideoProject[]> {
    return await db.select().from(videoProjects).where(eq(videoProjects.userId, userId));
  }

  async createProject(userId: string, insertProject: InsertVideoProject): Promise<VideoProject> {
    const id = randomUUID();
    const [project] = await db
      .insert(videoProjects)
      .values({
        ...insertProject,
        id,
        userId,
        status: "draft",
      })
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<VideoProject>): Promise<VideoProject | undefined> {
    const [updated] = await db
      .update(videoProjects)
      .set(updates)
      .where(eq(videoProjects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db
      .delete(videoProjects)
      .where(eq(videoProjects.id, id))
      .returning();
    return result.length > 0;
  }

  async getProcessingStatus(projectId: string): Promise<ProcessingStatus | undefined> {
    return this.processingStatuses.get(projectId);
  }

  async updateProcessingStatus(status: ProcessingStatus): Promise<void> {
    this.processingStatuses.set(status.projectId, status);
  }

  async deleteProcessingStatus(projectId: string): Promise<void> {
    this.processingStatuses.delete(projectId);
  }
}

export const storage = new DatabaseStorage();
