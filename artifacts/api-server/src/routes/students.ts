import { Router, type IRouter } from "express";
import { db, studentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  let rows;
  if (user.role === "admin") {
    rows = await db
      .select({
        id: studentsTable.id,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
        grade: studentsTable.grade,
        dateOfBirth: studentsTable.dateOfBirth,
        parentId: studentsTable.parentId,
        teacherId: studentsTable.teacherId,
      })
      .from(studentsTable)
      .orderBy(studentsTable.grade, studentsTable.firstName);
  } else if (user.role === "teacher") {
    rows = await db
      .select({
        id: studentsTable.id,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
        grade: studentsTable.grade,
        dateOfBirth: studentsTable.dateOfBirth,
        parentId: studentsTable.parentId,
        teacherId: studentsTable.teacherId,
      })
      .from(studentsTable)
      .where(eq(studentsTable.teacherId, user.userId))
      .orderBy(studentsTable.firstName);
  } else {
    rows = await db
      .select({
        id: studentsTable.id,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
        grade: studentsTable.grade,
        dateOfBirth: studentsTable.dateOfBirth,
        parentId: studentsTable.parentId,
        teacherId: studentsTable.teacherId,
      })
      .from(studentsTable)
      .where(eq(studentsTable.parentId, user.userId))
      .orderBy(studentsTable.firstName);
  }

  const enriched = await Promise.all(
    rows.map(async (s) => {
      const [parent] = s.parentId
        ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, s.parentId))
        : [];
      const [teacher] = s.teacherId
        ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, s.teacherId))
        : [];
      return {
        ...s,
        parentName: parent?.name ?? null,
        teacherName: teacher?.name ?? null,
        attendanceRate: null,
        averageScore: null,
      };
    })
  );

  res.json(enriched);
});

router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const user = req.user!;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, rawId));

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

  const [parent] = student.parentId
    ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, student.parentId))
    : [];
  const [teacher] = student.teacherId
    ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, student.teacherId))
    : [];

  res.json({
    ...student,
    parentName: parent?.name ?? null,
    teacherName: teacher?.name ?? null,
    attendanceRate: null,
    averageScore: null,
  });
});

export default router;
