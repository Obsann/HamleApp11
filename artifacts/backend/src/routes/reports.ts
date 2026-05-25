import { Router, type IRouter } from "express";
import { ReportModel, StudentModel, UserModel } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateReportBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichReport(report: any) {
  const student = await StudentModel.findById(report.studentId).select(
    "firstName lastName"
  );
  const teacher = await UserModel.findById(report.teacherId).select("name");
  return {
    id: report.id ?? report._id?.toString(),
    studentId: report.studentId.toString(),
    studentName: student
      ? `${student.firstName} ${student.lastName}`
      : "Unknown",
    subject: report.subject,
    score: report.score ?? null,
    type: report.type,
    date: report.date,
    teacherId: report.teacherId.toString(),
    teacherName: teacher?.name ?? "Unknown",
    notes: report.notes ?? null,
    term: report.term ?? null,
  };
}

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  let reports;

  if (user.role === "admin") {
    reports = await ReportModel.find().sort({ date: 1 });
  } else if (user.role === "teacher") {
    reports = await ReportModel.find({ teacherId: user.userId }).sort({
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
    reports = await ReportModel.find({ studentId: { $in: ids } }).sort({
      date: 1,
    });
  }

  const enriched = await Promise.all(reports.map(enrichReport));
  res.json(enriched);
});

router.post(
  "/reports",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    const parsed = CreateReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.message });
      return;
    }

    const report = await ReportModel.create({
      ...parsed.data,
      teacherId: req.user!.userId,
    });
    const enriched = await enrichReport(report);
    res.status(201).json(enriched);
  }
);

router.get(
  "/reports/student/:studentId",
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

    const reports = await ReportModel.find({ studentId: rawId }).sort({
      date: 1,
    });
    const enriched = await Promise.all(reports.map(enrichReport));
    res.json(enriched);
  }
);

export default router;
