import { Router, type IRouter } from "express";
import { AttendanceModel, StudentModel, AuditLogModel } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateAttendanceBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatAttendanceResponse(row: any) {
  const student = row.studentId;
  const studentName = student && typeof student === "object" && "firstName" in student 
    ? `${(student as any).firstName} ${(student as any).lastName}` 
    : "Unknown";

  const studentIdStr = student && typeof student === "object" && "_id" in student ? (student as any)._id.toString() : student?.toString() ?? null;

  return {
    id: row.id ?? row._id?.toString(),
    studentId: studentIdStr,
    studentName,
    date: row.date,
    status: row.status,
    teacherId: row.teacherId.toString(),
    notes: row.notes ?? null,
  };
}

// GET /attendance with N+1 fix, pagination, filtering, and sorting
router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  
  // Pagination
  const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(req.query["limit"] as string) || 100));
  const skip = (page - 1) * limit;

  // Filtering
  let query: Record<string, unknown> = {};

  if (user.role === "admin") {
    // Admin has access to all records
  } else if (user.role === "teacher") {
    const myStudents = await StudentModel.find({ teacherId: user.userId }).select("_id");
    const ids = myStudents.map((s) => s._id);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    query = { studentId: { $in: ids } };
  } else {
    // Parent gets attendance for their students
    const myStudents = await StudentModel.find({ parentId: user.userId }).select("_id");
    const ids = myStudents.map((s) => s._id);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    query = { studentId: { $in: ids } };
  }

  // Server-side filtering
  if (req.query["status"]) {
    query["status"] = req.query["status"];
  }
  if (req.query["date"]) {
    query["date"] = req.query["date"];
  }

  const rows = await AttendanceModel.find(query)
    .populate("studentId", "firstName lastName")
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  const enriched = rows.map(formatAttendanceResponse);
  res.json(enriched);
});

// POST /attendance - Record attendance (Teacher or Admin) with duplicate guard
router.post(
  "/attendance",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const parsed = CreateAttendanceBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid attendance data", errors: parsed.error.flatten() });
        return;
      }
      if (!parsed.data.studentId) {
        res.status(400).json({ message: "studentId is required" });
        return;
      }

      // Check if student exists
      const student = await StudentModel.findById(parsed.data.studentId);
      if (!student) {
        res.status(404).json({ message: "Student not found" });
        return;
      }

      // Duplicate Attendance Guard
      const existing = await AttendanceModel.findOne({
        studentId: parsed.data.studentId,
        date: parsed.data.date,
      });
      if (existing) {
        res.status(409).json({ message: "Attendance record already exists for this student on this date." });
        return;
      }

      const record = await AttendanceModel.create({
        ...parsed.data,
        teacherId: req.user!.userId,
      });

      const populated = await AttendanceModel.findById(record._id)
        .populate("studentId", "firstName lastName");

      // Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "create_attendance",
        entity: "Attendance",
        entityId: record.id,
        details: `Recorded attendance for ${student.firstName} ${student.lastName} on ${record.date} as ${record.status}`,
      });

      res.status(201).json(formatAttendanceResponse(populated));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to record attendance", error: err.message });
    }
  }
);

// GET /attendance/student/:studentId - Get attendance for a specific student
router.get(
  "/attendance/student/:studentId",
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

    const rows = await AttendanceModel.find({ studentId: rawId })
      .populate("studentId", "firstName lastName")
      .sort({ date: -1 });

    const enriched = rows.map(formatAttendanceResponse);
    res.json(enriched);
  }
);

// PUT /attendance/:id - Update attendance record (Teacher or Admin) with duplicate guard
router.put(
  "/attendance/:id",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
      const user = req.user!;
      const row = await AttendanceModel.findById(rawId);

      if (!row) {
        res.status(404).json({ message: "Attendance record not found" });
        return;
      }

      // Teacher can only update their own records
      if (user.role === "teacher" && row.teacherId.toString() !== user.userId) {
        res.status(403).json({ message: "Forbidden: You cannot edit another teacher's attendance sheet." });
        return;
      }

      const { status, notes, date } = req.body;

      if (status !== undefined) row.status = status;
      if (notes !== undefined) row.notes = notes;
      if (date !== undefined && date !== row.date) {
        // Guard against duplicate date for the same student
        const conflict = await AttendanceModel.findOne({
          studentId: row.studentId,
          date,
          _id: { $ne: rawId }
        });
        if (conflict) {
          res.status(409).json({ message: "Attendance record already exists for this student on this date." });
          return;
        }
        row.date = date;
      }

      await row.save();

      const populated = await AttendanceModel.findById(row._id)
        .populate("studentId", "firstName lastName");

      // Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "update_attendance",
        entity: "Attendance",
        entityId: row.id,
        details: `Updated attendance ID ${row.id} to status ${row.status} for date ${row.date}`,
      });

      res.json(formatAttendanceResponse(populated));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update attendance record", error: err.message });
    }
  }
);

// DELETE /attendance/:id - Delete attendance record (Teacher or Admin)
router.delete(
  "/attendance/:id",
  requireAuth,
  requireRole("admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
      const user = req.user!;
      const row = await AttendanceModel.findById(rawId);

      if (!row) {
        res.status(404).json({ message: "Attendance record not found" });
        return;
      }

      // Teacher can only delete their own records
      if (user.role === "teacher" && row.teacherId.toString() !== user.userId) {
        res.status(403).json({ message: "Forbidden: You cannot delete another teacher's attendance sheet." });
        return;
      }

      await AttendanceModel.findByIdAndDelete(rawId);

      // Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "delete_attendance",
        entity: "Attendance",
        entityId: rawId,
        details: `Deleted attendance ID ${rawId} for date ${row.date}`,
      });

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete attendance record", error: err.message });
    }
  }
);

export default router;
