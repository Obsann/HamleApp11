import { pgTable, text, uuid, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  subject: text("subject").notNull(),
  score: real("score"),
  type: text("type", { enum: ["grade", "assessment", "attendance"] }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  term: text("term"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
