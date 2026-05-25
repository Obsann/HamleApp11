import { Router, type IRouter } from "express";
import { StudentModel, UserModel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  let query: Record<string, unknown> = {};
  if (user.role === "teacher") query = { teacherId: user.userId };
  else if (user.role === "parent") query = { parentId: user.userId };

  const students = await StudentModel.find(query).sort({ grade: 1, firstName: 1 });

  const enriched = await Promise.all(
    students.map(async (s) => {
      const parent = s.parentId
        ? await UserModel.findById(s.parentId).select("name")
        : null;
      const teacher = s.teacherId
        ? await UserModel.findById(s.teacherId).select("name")
        : null;
      return {
        ...s.toJSON(),
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

  const student = await StudentModel.findById(rawId);
  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return;
  }

  if (user.role === "parent" && student.parentId?.toString() !== user.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  if (user.role === "teacher" && student.teacherId?.toString() !== user.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const parent = student.parentId
    ? await UserModel.findById(student.parentId).select("name")
    : null;
  const teacher = student.teacherId
    ? await UserModel.findById(student.teacherId).select("name")
    : null;

  res.json({
    ...student.toJSON(),
    parentName: parent?.name ?? null,
    teacherName: teacher?.name ?? null,
    attendanceRate: null,
    averageScore: null,
  });
});

export default router;
