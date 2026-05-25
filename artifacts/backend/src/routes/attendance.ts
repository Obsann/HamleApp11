import { Router, type IRouter } from "express";
import { AttendanceModel, StudentModel } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateAttendanceBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichAttendance(row: any) {
  const student = await StudentModel.findById(row.studentId).select(
    "firstName lastName"
  );
  return {
    id: row.id ?? row._id?.toString(),
    studentId: row.studentId.toString(),
    studentName: student
      ? `${student.firstName} ${student.lastName}`
      : "Unknown",
    date: row.date,
    status: row.status,
    teacherId: row.teacherId.toString(),
    notes: row.notes ?? null,
  };
}

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  let rows;

  if (user.role === "admin") {
    rows = await AttendanceModel.find().sort({ date: 1 });
  } else if (user.role === "teacher") {
    rows = await AttendanceModel.find({ teacherId: user.userId }).sort({
      date: 1,
    });
  } else {
    const myStudents = await StudentModel.find({
      parentId: user.userId,
    }).select("_id");
    const ids = myStudents.map((s) => s._id);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    rows = await AttendanceModel.find({ studentId: { $in: ids } }).sort({
      date: 1,
    });
  }

  const enriched = await Promise.all(rows.map(enrichAttendance));
  res.json(enriched);
});

router.post(
  "/attendance",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    const parsed = CreateAttendanceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.message });
      return;
    }

    const record = await AttendanceModel.create({
      ...parsed.data,
      teacherId: req.user!.userId,
    });
    const enriched = await enrichAttendance(record);
    res.status(201).json(enriched);
  }
);

router.get(
  "/attendance/student/:studentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params["studentId"])
        ? req.params["studentId"][0]
        : req.params["studentId"];
    const user = req.user!;

    const student = await StudentModel.findById(rawId);
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    if (
      user.role === "parent" &&
      student.parentId?.toString() !== user.userId
    ) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    if (
      user.role === "teacher" &&
      student.teacherId?.toString() !== user.userId
    ) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const rows = await AttendanceModel.find({ studentId: rawId }).sort({
      date: 1,
    });
    const enriched = await Promise.all(rows.map(enrichAttendance));
    res.json(enriched);
  }
);

export default router;
