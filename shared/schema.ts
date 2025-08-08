import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department").notNull(),
  password: text("password"), // Optional - users can use either password or email code
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tutorials = pgTable("tutorials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tag: text("tag").notNull(),
  idCademi: integer("id_cademi").notNull(),
});

export const tutorialReleases = pgTable("tutorial_releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientName: text("client_name").notNull(),
  clientCpf: text("client_cpf").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  companyName: text("company_name").notNull(),
  companyDocument: text("company_document").notNull(), // CNPJ da empresa
  companyRole: text("company_role").notNull(),
  tutorialIds: jsonb("tutorial_ids").notNull().$type<string[]>(),
  status: text("status").default("pending").notNull(), // pending, success, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tutorialReleases: many(tutorialReleases),
}));

export const tutorialReleasesRelations = relations(tutorialReleases, ({ one }) => ({
  user: one(users, {
    fields: [tutorialReleases.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
  used: true,
});

export const insertTutorialSchema = createInsertSchema(tutorials).omit({
  id: true,
});

export const insertTutorialReleaseSchema = createInsertSchema(tutorialReleases).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type Tutorial = typeof tutorials.$inferSelect;
export type InsertTutorial = z.infer<typeof insertTutorialSchema>;
export type TutorialRelease = typeof tutorialReleases.$inferSelect;
export type InsertTutorialRelease = z.infer<typeof insertTutorialReleaseSchema>;
