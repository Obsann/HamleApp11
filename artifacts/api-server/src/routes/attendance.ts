import { Router, type IRouter } from "express";
import { db, attendanceTable, studentsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateAttendanceBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichAttendance(row: typeof attendanceTable.$inferSelect) {
  const [student] = await db
    .select({ firstName: studentsTable.firstName, lastName: studentsTable.lastName })
    .from(studentsTable)
    .where(eq(studentsTable.id, row.studentId));
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
    date: row.date,
    status: row.status,
    teacherId: row.teacherId,
    notes: row.notes ?? null,
  };
}

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  let rows;

  if (user.role === "admin") {
    rows = await db.select().from(attendanceTable).orderBy(attendanceTable.date);
  } else if (user.role === "teacher") {
    rows = await db
      .select()
      .from(attendanceTable)
      .where(eq(attendanceTable.teacherId, user.userId))
      .orderBy(attendanceTable.date);
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
      .from(attendanceTable)
      .where(inArray(attendanceTable.studentId, ids))
      .orderBy(attendanceTable.date);
  }

  const enriched = await Promise.all(rows.map(enrichAttendance));
  res.json(enriched);
});

router.post("/attendance", requireAuth, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const parsed = CreateAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [record] = await db
    .insert(attendanceTable)
    .values({ ...parsed.data, teacherId: req.user!.userId })
    .returning();

  const enriched = await enrichAttendance(record);
  res.status(201).json(enriched);
});

router.get("/attendance/student/:studentId", requireAuth, async (req, res): Promise<void> => {
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
    .from(attendanceTable)
    .where(eq(attendanceTable.studentId, rawId))
    .orderBy(attendanceTable.date);

  const enriched = await Promise.all(rows.map(enrichAttendance));
  res.json(enriched);
});

export default router;
