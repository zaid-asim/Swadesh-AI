import { users, memories, type User, type UpsertUser, type Memory, type InsertMemory } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSetup(userId: string, setupCompleted: boolean): Promise<void>;
  getMemories(userId: string): Promise<Memory[]>;
  createMemory(userId: string, memory: InsertMemory): Promise<Memory>;
  updateMemory(id: string, userId: string, content: string): Promise<Memory | undefined>;
  deleteMemory(id: string, userId: string): Promise<boolean>;
}

function requireDb() {
  if (!db) throw new Error("Database is not configured. Set DATABASE_URL in your .env file.");
  return db;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const d = requireDb();
    const [user] = await d.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const d = requireDb();
    const [user] = await d
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSetup(userId: string, setupCompleted: boolean): Promise<void> {
    const d = requireDb();
    await d.update(users).set({ setupCompleted, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async getMemories(userId: string): Promise<Memory[]> {
    const d = requireDb();
    return await d.select().from(memories).where(eq(memories.userId, userId));
  }

  async createMemory(userId: string, memory: InsertMemory): Promise<Memory> {
    const d = requireDb();
    const [newMemory] = await d
      .insert(memories)
      .values({ ...memory, userId })
      .returning();
    return newMemory;
  }

  async updateMemory(id: string, userId: string, content: string): Promise<Memory | undefined> {
    const d = requireDb();
    const [existing] = await d.select().from(memories).where(eq(memories.id, id));
    if (!existing || existing.userId !== userId) return undefined;
    const [updated] = await d
      .update(memories)
      .set({ content, updatedAt: new Date() })
      .where(eq(memories.id, id))
      .returning();
    return updated;
  }

  async deleteMemory(id: string, userId: string): Promise<boolean> {
    const d = requireDb();
    const [existing] = await d.select().from(memories).where(eq(memories.id, id));
    if (!existing || existing.userId !== userId) return false;
    await d.delete(memories).where(eq(memories.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
