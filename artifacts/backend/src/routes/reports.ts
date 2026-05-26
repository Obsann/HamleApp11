import { Router, type IRouter } from "express";
import { ReportModel, StudentModel, UserModel, AuditLogModel } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateReportBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatReportResponse(report: any) {
  const student = report.studentId;
  const teacher = report.teacherId;

  const studentName = student && typeof student === "object" && "firstName" in student 
    ? `${(student as any).firstName} ${(student as any).lastName}` 
    : "Unknown";
  
  const teacherName = teacher && typeof teacher === "object" && "name" in teacher 
    ? (teacher as any).name 
    : "Unknown";

  const studentIdStr = student && typeof student === "object" && "_id" in student ? (student as any)._id.toString() : student?.toString() ?? null;
  const teacherIdStr = teacher && typeof teacher === "object" && "_id" in teacher ? (teacher as any)._id.toString() : teacher?.toString() ?? null;

  return {
    id: report.id ?? report._id?.toString(),
    studentId: studentIdStr,
    studentName,
    subject: report.subject,
    score: report.score ?? null,
    midExam: report.midExam ?? null,
    tests: report.tests ?? null,
    continuousAssessment: report.continuousAssessment ?? null,
    finalExam: report.finalExam ?? null,
    type: report.type,
    date: report.date,
    teacherId: teacherIdStr,
    teacherName,
    notes: report.notes ?? null,
    term: report.term ?? null,
    status: report.status ?? null,
  };
}

// GET /reports with N+1 fix, pagination, filtering, and sorting
router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  
  // Pagination
  const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(req.query["limit"] as string) || 100));
  const skip = (page - 1) * limit;

  // Filtering
  let query: Record<string, unknown> = {};

  if (user.role === "admin") {
    // Admin has access to all reports
  } else if (user.role === "teacher") {
    const myStudents = await StudentModel.find({ teacherId: user.userId }).select("_id");
    const ids = myStudents.map((s) => s._id);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    query = { studentId: { $in: ids } };
  } else {
    // Parent gets reports for their students
    const myStudents = await StudentModel.find({ parentId: user.userId }).select("_id");
    const ids = myStudents.map((s) => s._id);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    query = { studentId: { $in: ids } };
  }

  // Server-side search & filtering
  if (req.query["subject"]) {
    query["subject"] = req.query["subject"];
  }
  if (req.query["type"]) {
    query["type"] = req.query["type"];
  }
  if (req.query["term"]) {
    query["term"] = req.query["term"];
  }

  const reports = await ReportModel.find(query)
    .populate("studentId", "firstName lastName")
    .populate("teacherId", "name")
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  const enriched = reports.map(formatReportResponse);
  res.json(enriched);
});

// POST /reports - Create a report (Teacher or Admin)
router.post(
  "/reports",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const parsed = CreateReportBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid report data", errors: parsed.error.flatten() });
        return;
      }
      if (!parsed.data.studentId) {
        res.status(400).json({ message: "studentId is required" });
        return;
      }

      // Check if student exists
      const student = await StudentModel.findById(parsed.data.studentId);
      if (!student) {
        res.status(404).json({ message: "Student not found." });
        return;
      }

      // Score validation
      const score = parsed.data.score;
      if (score !== undefined && score !== null) {
        if (score < 0 || score > 100) {
          res.status(400).json({ message: "Score must be between 0 and 100." });
          return;
        }
      }

      const report = await ReportModel.create({
        ...parsed.data,
        teacherId: req.user!.userId,
      });

      const populated = await ReportModel.findById(report._id)
        .populate("studentId", "firstName lastName")
        .populate("teacherId", "name");

      // Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "create_report",
        entity: "Report",
        entityId: report.id,
        details: `Created report for ${student.firstName} ${student.lastName} in ${report.subject} (${report.type}, Score: ${score ?? "N/A"})`,
      });

      res.status(201).json(formatReportResponse(populated));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create report", error: err.message });
    }
  }
);

// GET /reports/student/:studentId - Get reports for a specific student
router.get(
  "/reports/student/:studentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params["studentId"])
      ? req.params["studentId"][0]
      : req.params["studentId"];
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

    const reports = await ReportModel.find({ studentId: rawId })
      .populate("studentId", "firstName lastName")
      .populate("teacherId", "name")
      .sort({ date: -1 });

    const enriched = reports.map(formatReportResponse);
    res.json(enriched);
  }
);

// PUT /reports/:id - Update report (Teacher or Admin)
router.put(
  "/reports/:id",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
      const user = req.user!;
      const report = await ReportModel.findById(rawId);

      if (!report) {
        res.status(404).json({ message: "Report not found" });
        return;
      }

      // Teacher can only update their own reports
      if (user.role === "teacher" && report.teacherId.toString() !== user.userId) {
        res.status(403).json({ message: "Forbidden: You cannot edit another teacher's report." });
        return;
      }

      const { score, notes, term, subject, type, date, midExam, tests, continuousAssessment, finalExam } = req.body;

      // Validate date if provided
      if (date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          res.status(400).json({ message: "Date must be in YYYY-MM-DD format." });
          return;
        }
        const [y, m, d] = date.split("-").map(Number);
        const dt = new Date(y!, m! - 1, d);
        if (dt.getFullYear() !== y || dt.getMonth() !== m! - 1 || dt.getDate() !== d) {
          res.status(400).json({ message: "Date must be a valid calendar date." });
          return;
        }
      }

      if (score !== undefined) {
        if (score !== null && (score < 0 || score > 100)) {
          res.status(400).json({ message: "Score must be between 0 and 100." });
          return;
        }
        report.score = score;
      }
      if (notes !== undefined) report.notes = notes;
      if (term !== undefined) report.term = term;
      if (subject !== undefined) report.subject = subject;
      if (type !== undefined) report.type = type;
      if (date !== undefined) report.date = date;

      // Validate sub-score ranges (0-100) on update
      if (midExam !== undefined) {
        if (midExam !== null && (midExam < 0 || midExam > 100)) {
          res.status(400).json({ message: "Mid Exam score must be between 0 and 100." });
          return;
        }
        report.midExam = midExam;
      }
      if (tests !== undefined) {
        if (tests !== null && (tests < 0 || tests > 100)) {
          res.status(400).json({ message: "Tests score must be between 0 and 100." });
          return;
        }
        report.tests = tests;
      }
      if (continuousAssessment !== undefined) {
        if (continuousAssessment !== null && (continuousAssessment < 0 || continuousAssessment > 100)) {
          res.status(400).json({ message: "Continuous Assessment score must be between 0 and 100." });
          return;
        }
        report.continuousAssessment = continuousAssessment;
      }
      if (finalExam !== undefined) {
        if (finalExam !== null && (finalExam < 0 || finalExam > 100)) {
          res.status(400).json({ message: "Final Exam score must be between 0 and 100." });
          return;
        }
        report.finalExam = finalExam;
      }

      // Validate total doesn't exceed 100
      const totalCheck = (report.midExam ?? 0) + (report.tests ?? 0) + (report.continuousAssessment ?? 0) + (report.finalExam ?? 0);
      if (totalCheck > 100) {
        res.status(400).json({ message: `Total of all sub-scores (${totalCheck}) exceeds 100.` });
        return;
      }

      await report.save();

      const populated = await ReportModel.findById(report._id)
        .populate("studentId", "firstName lastName")
        .populate("teacherId", "name");

      // Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "update_report",
        entity: "Report",
        entityId: report.id,
        details: `Updated report ID ${report.id} in ${report.subject} (${report.type}, Score: ${score ?? "N/A"})`,
      });

      res.json(formatReportResponse(populated));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update report", error: err.message });
    }
  }
);

// DELETE /reports/:id - Delete report (Teacher or Admin)
router.delete(
  "/reports/:id",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
      const user = req.user!;
      const report = await ReportModel.findById(rawId);

      if (!report) {
        res.status(404).json({ message: "Report not found" });
        return;
      }

      // Teacher can only delete their own reports
      if (user.role === "teacher" && report.teacherId.toString() !== user.userId) {
        res.status(403).json({ message: "Forbidden: You cannot delete another teacher's report." });
        return;
      }

      await ReportModel.findByIdAndDelete(rawId);

      // Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "delete_report",
        entity: "Report",
        entityId: rawId,
        details: `Deleted report ID ${rawId} for subject ${report.subject} (${report.type})`,
      });

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete report", error: err.message });
    }
  }
);

export default router;
