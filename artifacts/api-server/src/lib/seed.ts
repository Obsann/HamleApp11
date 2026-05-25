import bcrypt from "bcryptjs";
import { db, usersTable, studentsTable, reportsTable, attendanceTable } from "@workspace/db";
import { logger } from "./logger";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

const TODAY = daysAgo(0);

export async function seedIfEmpty() {
  const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding initial data...");
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ── Users ─────────────────────────────────────────────────────────────────
  const [admin] = await db.insert(usersTable).values({
    name: "Abebe Girma",
    email: "admin@hamle.edu",
    passwordHash: await hash("admin123"),
    role: "admin",
  }).returning();

  const [t1, t2, t3] = await db.insert(usersTable).values([
    { name: "Tigist Alemu",   email: "teacher@hamle.edu",  passwordHash: await hash("teacher123"), role: "teacher" },
    { name: "Kebede Worku",   email: "teacher2@hamle.edu", passwordHash: await hash("teacher123"), role: "teacher" },
    { name: "Almaz Tadesse",  email: "teacher3@hamle.edu", passwordHash: await hash("teacher123"), role: "teacher" },
  ]).returning();

  const parents = await db.insert(usersTable).values([
    { name: "Dawit Bekele",   email: "parent@hamle.edu",   passwordHash: await hash("parent123"), role: "parent" },
    { name: "Mekdes Haile",   email: "parent2@hamle.edu",  passwordHash: await hash("parent123"), role: "parent" },
    { name: "Girma Tesfaye",  email: "parent3@hamle.edu",  passwordHash: await hash("parent123"), role: "parent" },
    { name: "Hiwot Alem",     email: "parent4@hamle.edu",  passwordHash: await hash("parent123"), role: "parent" },
    { name: "Solomon Tadesse", email: "parent5@hamle.edu", passwordHash: await hash("parent123"), role: "parent" },
    { name: "Marta Gebre",    email: "parent6@hamle.edu",  passwordHash: await hash("parent123"), role: "parent" },
    { name: "Yohannes Kebede", email: "parent7@hamle.edu", passwordHash: await hash("parent123"), role: "parent" },
    { name: "Selamawit Worku", email: "parent8@hamle.edu", passwordHash: await hash("parent123"), role: "parent" },
  ]).returning();

  const [p1, p2, p3, p4, p5, p6, p7, p8] = parents;

  // ── Students ──────────────────────────────────────────────────────────────
  // Teacher 1 — Grade 2  (parent@hamle.edu has 2 children here)
  const grade2 = await db.insert(studentsTable).values([
    { firstName: "Yonas",   lastName: "Bekele",   grade: "Grade 2", dateOfBirth: "2017-03-15", parentId: p1.id, teacherId: t1.id },
    { firstName: "Hana",    lastName: "Bekele",   grade: "Grade 2", dateOfBirth: "2017-07-22", parentId: p1.id, teacherId: t1.id },
    { firstName: "Sara",    lastName: "Tesfaye",  grade: "Grade 2", dateOfBirth: "2017-09-10", parentId: p3.id, teacherId: t1.id },
    { firstName: "Abel",    lastName: "Haile",    grade: "Grade 2", dateOfBirth: "2017-12-01", parentId: p2.id, teacherId: t1.id },
  ]).returning();

  // Teacher 2 — Grade 3
  const grade3 = await db.insert(studentsTable).values([
    { firstName: "Biruk",   lastName: "Haile",    grade: "Grade 3", dateOfBirth: "2016-05-18", parentId: p2.id, teacherId: t2.id },
    { firstName: "Liya",    lastName: "Alem",     grade: "Grade 3", dateOfBirth: "2016-02-25", parentId: p4.id, teacherId: t2.id },
    { firstName: "Natnael", lastName: "Tadesse",  grade: "Grade 3", dateOfBirth: "2016-08-14", parentId: p5.id, teacherId: t2.id },
    { firstName: "Meron",   lastName: "Gebre",    grade: "Grade 3", dateOfBirth: "2016-11-30", parentId: p6.id, teacherId: t2.id },
  ]).returning();

  // Teacher 3 — Grade 4
  const grade4 = await db.insert(studentsTable).values([
    { firstName: "Selam",   lastName: "Worku",    grade: "Grade 4", dateOfBirth: "2015-04-07", parentId: p7.id, teacherId: t3.id },
    { firstName: "Amir",    lastName: "Kebede",   grade: "Grade 4", dateOfBirth: "2015-06-19", parentId: p7.id, teacherId: t3.id },
    { firstName: "Ruth",    lastName: "Girma",    grade: "Grade 4", dateOfBirth: "2015-10-03", parentId: p8.id, teacherId: t3.id },
    { firstName: "Yosef",   lastName: "Alemu",    grade: "Grade 4", dateOfBirth: "2015-01-22", parentId: p3.id, teacherId: t3.id },
  ]).returning();

  const allStudents = [...grade2, ...grade3, ...grade4];

  // ── Reports ───────────────────────────────────────────────────────────────
  const subjects = ["Mathematics", "Amharic", "English", "Science", "Social Studies"];
  const terms = ["Term 1", "Term 2"];
  const reportRows: (typeof reportsTable.$inferInsert)[] = [];

  const teacherFor = (s: typeof allStudents[0]) =>
    grade2.some((x) => x.id === s.id) ? t1.id
    : grade3.some((x) => x.id === s.id) ? t2.id
    : t3.id;

  for (const student of allStudents) {
    const tid = teacherFor(student);
    // 2 term grades per subject over the last 3 weeks
    for (const subject of subjects) {
      const base = 60 + Math.floor(Math.random() * 35);
      reportRows.push({
        studentId: student.id, teacherId: tid, subject,
        score: base, type: "grade",
        date: daysAgo(21), term: terms[0],
        notes: base >= 85 ? "Excellent performance" : base >= 70 ? "Satisfactory progress" : "Needs improvement",
      });
      reportRows.push({
        studentId: student.id, teacherId: tid, subject,
        score: Math.min(100, base + Math.floor(Math.random() * 10) - 3),
        type: "grade", date: daysAgo(7), term: terms[1],
      });
    }
    // 2 mid-term assessments
    reportRows.push({
      studentId: student.id, teacherId: tid,
      subject: "Mathematics", score: 55 + Math.floor(Math.random() * 40),
      type: "assessment", date: daysAgo(14), term: terms[0],
      notes: "Mid-term assessment",
    });
    reportRows.push({
      studentId: student.id, teacherId: tid,
      subject: "English", score: 55 + Math.floor(Math.random() * 40),
      type: "assessment", date: daysAgo(3), term: terms[1],
    });
  }

  await db.insert(reportsTable).values(reportRows);

  // ── Attendance ────────────────────────────────────────────────────────────
  const attendanceRows: (typeof attendanceTable.$inferInsert)[] = [];
  const statusWeights: Array<typeof attendanceTable.$inferSelect["status"]> = [
    "present", "present", "present", "present", "present",
    "present", "present", "present", "late", "absent",
  ];

  for (let day = 14; day >= 1; day--) {
    const d = new Date(Date.now() - day * 86400000);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue; // skip weekends
    const dateStr = d.toISOString().split("T")[0];

    for (const student of allStudents) {
      const tid = teacherFor(student);
      const status = statusWeights[Math.floor(Math.random() * statusWeights.length)];
      attendanceRows.push({
        studentId: student.id, teacherId: tid, date: dateStr, status,
        notes: status === "absent" ? "Parent notified" : status === "late" ? "Arrived 10 min late" : undefined,
      });
    }
  }

  // Today's attendance
  for (const student of allStudents) {
    const tid = teacherFor(student);
    const status = statusWeights[Math.floor(Math.random() * statusWeights.length)];
    attendanceRows.push({
      studentId: student.id, teacherId: tid, date: TODAY, status,
      notes: status === "absent" ? "Parent notified" : status === "late" ? "Arrived late" : undefined,
    });
  }

  await db.insert(attendanceTable).values(attendanceRows);

  logger.info(
    "Seeding complete. Accounts: admin@hamle.edu/admin123 | teacher@hamle.edu/teacher123 | teacher2@hamle.edu/teacher123 | parent@hamle.edu/parent123"
  );
}
