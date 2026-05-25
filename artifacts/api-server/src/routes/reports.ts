import { Router, type IRouter } from "express";
import { db, reportsTable, studentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateReportBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichReport(report: typeof reportsTable.$inferSelect) {
  const [student] = await db
    .select({ firstName: studentsTable.firstName, lastName: studentsTable.lastName })
    .from(studentsTable)
    .where(eq(studentsTable.id, report.studentId));
  const [teacher] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, report.teacherId));
  return {
    id: report.id,
    studentId: report.studentId,
    studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
    subject: report.subject,
    score: report.score ?? null,
    type: report.type,
    date: report.date,
    teacherId: report.teacherId,
    teacherName: teacher?.name ?? "Unknown",
    notes: report.notes ?? null,
    term: report.term ?? null,
  };
}

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  let rows;

  if (user.role === "admin") {
    rows = await db.select().from(reportsTable).orderBy(reportsTable.date);
  } else if (user.role === "teacher") {
    rows = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.teacherId, user.userId))
      .orderBy(reportsTable.date);
  } else {
    const myStudents = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.parentId, user.userId));
    const ids = myStudents.map((s) => s.id);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    rows = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.studentId, ids[0]))
      .orderBy(reportsTable.date);
  }

  const enriched = await Promise.all(rows.map(enrichReport));
  res.json(enriched);
});

router.post("/reports", requireAuth, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [report] = await db
    .insert(reportsTable)
    .values({ ...parsed.data, teacherId: req.user!.userId })
    .returning();

  const enriched = await enrichReport(report);
  res.status(201).json(enriched);
});

router.get("/reports/student/:studentId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["studentId"]) ? req.params["studentId"][0] : req.params["studentId"];
  const user = req.user!;

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, rawId));
  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return;
  }
  if (user.role === "parent" && student.parentId !== user.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  if (user.role === "teacher" && student.teacherId !== user.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.studentId, rawId))
    .orderBy(reportsTable.date);

  const enriched = await Promise.all(rows.map(enrichReport));
  res.json(enriched);
});

export default router;
