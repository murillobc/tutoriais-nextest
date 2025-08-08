import { 
  users, 
  verificationCodes, 
  tutorials, 
  tutorialReleases,
  type User, 
  type InsertUser,
  type VerificationCode,
  type InsertVerificationCode,
  type Tutorial,
  type InsertTutorial,
  type TutorialRelease,
  type InsertTutorialRelease
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Verification codes
  createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode>;
  getValidVerificationCode(email: string, code: string): Promise<VerificationCode | undefined>;
  markVerificationCodeAsUsed(id: string): Promise<void>;
  
  // Tutorials
  getAllTutorials(): Promise<Tutorial[]>;
  getTutorialsByIds(ids: string[]): Promise<Tutorial[]>;
  createTutorial(tutorial: InsertTutorial): Promise<Tutorial>;
  
  // Tutorial releases
  createTutorialRelease(release: InsertTutorialRelease): Promise<TutorialRelease>;
  getTutorialReleasesByUser(userId: string): Promise<TutorialRelease[]>;
  getAllTutorialReleases(): Promise<(TutorialRelease & { user: User })[]>;
  updateTutorialReleaseStatus(id: string, status: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode> {
    const [verificationCode] = await db
      .insert(verificationCodes)
      .values(code)
      .returning();
    return verificationCode;
  }

  async getValidVerificationCode(email: string, code: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email),
          eq(verificationCodes.code, code),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, new Date())
        )
      );
    return verificationCode || undefined;
  }

  async markVerificationCodeAsUsed(id: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, id));
  }

  async getAllTutorials(): Promise<Tutorial[]> {
    return await db.select().from(tutorials);
  }

  async getTutorialsByIds(ids: string[]): Promise<Tutorial[]> {
    if (ids.length === 0) return [];
    return await db.select().from(tutorials).where(inArray(tutorials.id, ids));
  }

  async createTutorial(tutorial: InsertTutorial): Promise<Tutorial> {
    const [newTutorial] = await db
      .insert(tutorials)
      .values(tutorial)
      .returning();
    return newTutorial;
  }

  async createTutorialRelease(release: InsertTutorialRelease): Promise<TutorialRelease> {
    const releaseData = {
      userId: release.userId,
      clientName: release.clientName,
      clientCpf: release.clientCpf,
      clientEmail: release.clientEmail,
      clientPhone: release.clientPhone,
      companyName: release.companyName,
      companyDocument: release.companyDocument,
      companyRole: release.companyRole,
      tutorialIds: release.tutorialIds,
      status: 'pending' as const
    };
    
    const [tutorialRelease] = await db
      .insert(tutorialReleases)
      .values(releaseData)
      .returning();
    return tutorialRelease;
  }

  async getTutorialReleasesByUser(userId: string): Promise<TutorialRelease[]> {
    return await db
      .select()
      .from(tutorialReleases)
      .where(eq(tutorialReleases.userId, userId))
      .orderBy(desc(tutorialReleases.createdAt));
  }

  async getAllTutorialReleases(): Promise<(TutorialRelease & { user: User })[]> {
    const results = await db
      .select({
        id: tutorialReleases.id,
        userId: tutorialReleases.userId,
        clientName: tutorialReleases.clientName,
        clientCpf: tutorialReleases.clientCpf,
        clientEmail: tutorialReleases.clientEmail,
        clientPhone: tutorialReleases.clientPhone,
        companyName: tutorialReleases.companyName,
        companyDocument: tutorialReleases.companyDocument,
        companyRole: tutorialReleases.companyRole,
        tutorialIds: tutorialReleases.tutorialIds,
        status: tutorialReleases.status,
        createdAt: tutorialReleases.createdAt,
        user: users
      })
      .from(tutorialReleases)
      .leftJoin(users, eq(tutorialReleases.userId, users.id))
      .orderBy(desc(tutorialReleases.createdAt));
    
    return results.filter(result => result.user !== null) as (TutorialRelease & { user: User })[];
  }

  async updateTutorialReleaseStatus(id: string, status: string): Promise<void> {
    await db
      .update(tutorialReleases)
      .set({ status })
      .where(eq(tutorialReleases.id, id));
  }
}

export const storage = new DatabaseStorage();
