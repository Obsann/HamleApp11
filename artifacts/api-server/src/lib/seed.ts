import bcrypt from "bcryptjs";
import { db, usersTable, studentsTable, reportsTable, attendanceTable } from "@workspace/db";
import { logger } from "./logger";

export async function seedIfEmpty() {
  const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding initial data...");

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const [admin] = await db.insert(usersTable).values({
    name: "Abebe Girma",
    email: "admin@hamle.edu",
    passwordHash: await hash("admin123"),
    role: "admin",
  }).returning();

  const [teacher1] = await db.insert(usersTable).values({
    name: "Tigist Alemu",
    email: "teacher@hamle.edu",
    passwordHash: await hash("teacher123"),
    role: "teacher",
  }).returning();

  const [parent1] = await db.insert(usersTable).values({
    name: "Dawit Bekele",
    email: "parent@hamle.edu",
    passwordHash: await hash("parent123"),
    role: "parent",
  }).returning();

  const [parent2] = await db.insert(usersTable).values({
    name: "Mekdes Haile",
    email: "parent2@hamle.edu",
    passwordHash: await hash("parent123"),
    role: "parent",
  }).returning();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [s1] = await db.insert(studentsTable).values({
    firstName: "Yonas",
    lastName: "Bekele",
    grade: "Grade 3",
    dateOfBirth: "2016-03-15",
    parentId: parent1.id,
    teacherId: teacher1.id,
  }).returning();

  const [s2] = await db.insert(studentsTable).values({
    firstName: "Hana",
    lastName: "Bekele",
    grade: "Grade 1",
    dateOfBirth: "2018-07-22",
    parentId: parent1.id,
    teacherId: teacher1.id,
  }).returning();

  const [s3] = await db.insert(studentsTable).values({
    firstName: "Biruk",
    lastName: "Haile",
    grade: "Grade 4",
    dateOfBirth: "2015-11-08",
    parentId: parent2.id,
    teacherId: teacher1.id,
  }).returning();

  const [s4] = await db.insert(studentsTable).values({
    firstName: "Selam",
    lastName: "Tadesse",
    grade: "Grade 2",
    dateOfBirth: "2017-05-30",
    parentId: null,
    teacherId: teacher1.id,
  }).returning();

  await db.insert(reportsTable).values([
    { studentId: s1.id, teacherId: teacher1.id, subject: "Mathematics", score: 88, type: "grade", date: weekAgo, term: "Term 1", notes: "Excellent progress in arithmetic" },
    { studentId: s1.id, teacherId: teacher1.id, subject: "Amharic", score: 92, type: "grade", date: weekAgo, term: "Term 1" },
    { studentId: s1.id, teacherId: teacher1.id, subject: "English", score: 75, type: "grade", date: yesterday, term: "Term 1" },
    { studentId: s2.id, teacherId: teacher1.id, subject: "Mathematics", score: 95, type: "grade", date: weekAgo, term: "Term 1", notes: "Outstanding performance" },
    { studentId: s2.id, teacherId: teacher1.id, subject: "Reading", score: 85, type: "assessment", date: yesterday, term: "Term 1" },
    { studentId: s3.id, teacherId: teacher1.id, subject: "Science", score: 78, type: "grade", date: weekAgo, term: "Term 1" },
    { studentId: s3.id, teacherId: teacher1.id, subject: "Mathematics", score: 82, type: "grade", date: yesterday, term: "Term 1" },
    { studentId: s4.id, teacherId: teacher1.id, subject: "Mathematics", score: 70, type: "grade", date: weekAgo, term: "Term 1" },
  ]);

  await db.insert(attendanceTable).values([
    { studentId: s1.id, teacherId: teacher1.id, date: today, status: "present" },
    { studentId: s2.id, teacherId: teacher1.id, date: today, status: "present" },
    { studentId: s3.id, teacherId: teacher1.id, date: today, status: "absent", notes: "Sick" },
    { studentId: s4.id, teacherId: teacher1.id, date: today, status: "late" },
    { studentId: s1.id, teacherId: teacher1.id, date: yesterday, status: "present" },
    { studentId: s2.id, teacherId: teacher1.id, date: yesterday, status: "present" },
    { studentId: s3.id, teacherId: teacher1.id, date: yesterday, status: "present" },
    { studentId: s4.id, teacherId: teacher1.id, date: yesterday, status: "present" },
  ]);

  logger.info("Seeding complete. Demo accounts: admin@hamle.edu / teacher@hamle.edu / parent@hamle.edu (password: admin123/teacher123/parent123)");
}
