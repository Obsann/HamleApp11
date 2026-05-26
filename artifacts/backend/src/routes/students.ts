import { Router, type IRouter } from "express";
import { StudentModel, UserModel, AttendanceModel, ReportModel, AuditLogModel } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// --- Validation Constants ---
const NAME_REGEX = /^[a-zA-Z\u1200-\u137F\s]+$/;
const FAYDA_REGEX = /^\d{12}$/;
const PHONE_REGEX = /^(\+251[97]\d{8}|0[97]\d{8})$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
}

function getAgeYears(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function extractPhone(emergencyContact: string | null | undefined): string | null {
  if (!emergencyContact) return null;
  const match = emergencyContact.match(/(\+251[97]\d{8}|0[97]\d{8})/);
  return match ? match[1] : null;
}

async function generateStudentNo(): Promise<string> {
  const count = await StudentModel.countDocuments();
  const nextNum = count + 1;
  const numStr = nextNum.toString().padStart(4, "0");
  let studentNo = `ST${numStr}`;
  let exists = await StudentModel.findOne({ studentNo });
  let suffix = 1;
  while (exists) {
    studentNo = `ST${numStr}-${suffix}`;
    exists = await StudentModel.findOne({ studentNo });
    suffix++;
  }
  return studentNo;
}

// GET /students with N+1 fix, pagination, sorting, aggregation, and filtering
router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  
  // Pagination
  const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(req.query["limit"] as string) || 100));
  const skip = (page - 1) * limit;

  // Filtering
  let query: Record<string, unknown> = {};
  if (user.role === "teacher") {
    query = { teacherId: user.userId };
  } else if (user.role === "parent") {
    query = { parentId: user.userId };
  }

  // Server-side search & filtering
  if (req.query["grade"]) {
    query["grade"] = req.query["grade"];
  }
  if (req.query["search"]) {
    const searchRegex = new RegExp(req.query["search"] as string, "i");
    query["$or"] = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { studentNo: searchRegex }
    ];
  }

  // Retrieve students with populated user references
  const students = await StudentModel.find(query)
    .populate({ path: "parentId", select: "name" })
    .populate({ path: "teacherId", select: "name" })
    .sort({ grade: 1, firstName: 1 })
    .skip(skip)
    .limit(limit);

  const studentIds = students.map((s) => s._id);

  // Bulk aggregate attendance rate to avoid N+1 queries
  const attendanceAgg = await AttendanceModel.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    {
      $group: {
        _id: "$studentId",
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
        },
      },
    },
  ]);

  // Bulk aggregate average score to avoid N+1 queries
  const reportAgg = await ReportModel.aggregate([
    { $match: { studentId: { $in: studentIds }, type: "grade", score: { $ne: null } } },
    {
      $group: {
        _id: "$studentId",
        avgScore: { $avg: "$score" },
      },
    },
  ]);

  const attendanceMap = new Map(
    attendanceAgg.map((a) => [a._id.toString(), Math.round((a.present / a.total) * 1000) / 10])
  );
  const scoreMap = new Map(
    reportAgg.map((r) => [r._id.toString(), Math.round(r.avgScore * 10) / 10])
  );

  const enriched = students.map((s) => {
    const parentName = s.parentId && typeof s.parentId === "object" && "name" in s.parentId ? (s.parentId as any).name : null;
    const teacherName = s.teacherId && typeof s.teacherId === "object" && "name" in s.teacherId ? (s.teacherId as any).name : null;
    
    const parentIdStr = s.parentId ? ((s.parentId as any)._id?.toString() ?? (s.parentId as any).toString()) : null;
    const teacherIdStr = s.teacherId ? ((s.teacherId as any)._id?.toString() ?? (s.teacherId as any).toString()) : null;

    return {
      ...s.toJSON(),
      parentId: parentIdStr,
      teacherId: teacherIdStr,
      parentName,
      teacherName,
      attendanceRate: attendanceMap.get(s._id.toString()) ?? null,
      averageScore: scoreMap.get(s._id.toString()) ?? null,
    };
  });

  res.json(enriched);
});

// POST /students - Create student (Admin only)
router.post("/students", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const { 
      firstName, 
      lastName, 
      grade, 
      dateOfBirth, 
      parentId, 
      teacherId,
      gender,
      address,
      faydaId,
      enrollmentStatus,
      medicalInfo,
      emergencyContact
    } = req.body;

    if (!firstName?.trim() || !lastName?.trim() || !grade?.trim() || !dateOfBirth?.trim()) {
      res.status(400).json({ message: "firstName, lastName, grade, and dateOfBirth are required" });
      return;
    }

    // Validate names contain only letters
    if (!NAME_REGEX.test(firstName.trim())) {
      res.status(400).json({ message: "First name must contain only letters (no numbers or special characters)." });
      return;
    }
    if (!NAME_REGEX.test(lastName.trim())) {
      res.status(400).json({ message: "Last name must contain only letters (no numbers or special characters)." });
      return;
    }

    // Validate date of birth is a real calendar date
    if (!isValidCalendarDate(dateOfBirth.trim())) {
      res.status(400).json({ message: "Date of birth must be a valid date in YYYY-MM-DD format." });
      return;
    }
    const age = getAgeYears(dateOfBirth.trim());
    if (age < 3 || age > 18) {
      res.status(400).json({ message: "Student must be between 3 and 18 years old." });
      return;
    }

    // Validate Fayda ID if provided
    if (faydaId && !FAYDA_REGEX.test(faydaId.trim())) {
      res.status(400).json({ message: "Fayda ID must be exactly 12 digits (numbers only)." });
      return;
    }

    // Validate emergency contact phone if provided
    if (emergencyContact) {
      const phone = extractPhone(emergencyContact);
      if (phone && !PHONE_REGEX.test(phone)) {
        res.status(400).json({ message: "Emergency contact phone must be in Ethiopian format: +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX." });
        return;
      }
    }

    // Verify parent and teacher exist in the database if provided
    if (parentId) {
      const pExists = await UserModel.findOne({ _id: parentId, role: "parent" });
      if (!pExists) {
        res.status(400).json({ message: `Parent user with ID ${parentId} does not exist.` });
        return;
      }
    }
    if (teacherId) {
      const tExists = await UserModel.findOne({ _id: teacherId, role: "teacher" });
      if (!tExists) {
        res.status(400).json({ message: `Teacher user with ID ${teacherId} does not exist.` });
        return;
      }
    }

    const studentNo = await generateStudentNo();

    const student = await StudentModel.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      grade: grade.trim(),
      dateOfBirth: dateOfBirth.trim(),
      parentId: parentId || null,
      teacherId: teacherId || null,
      studentNo,
      gender: gender || "male",
      address: address || null,
      faydaId: faydaId || null,
      enrollmentStatus: enrollmentStatus || "active",
      medicalInfo: medicalInfo || null,
      emergencyContact: emergencyContact || null,
    });

    // Populate created student
    const populated = await StudentModel.findById(student._id)
      .populate("parentId", "name")
      .populate("teacherId", "name");

    const parentName = populated?.parentId && typeof populated.parentId === "object" && "name" in populated.parentId ? (populated.parentId as any).name : null;
    const teacherName = populated?.teacherId && typeof populated.teacherId === "object" && "name" in populated.teacherId ? (populated.teacherId as any).name : null;

    const parentIdStr = populated?.parentId && typeof populated.parentId === "object" && "_id" in populated.parentId ? (populated.parentId as any)._id.toString() : populated?.parentId?.toString() ?? null;
    const teacherIdStr = populated?.teacherId && typeof populated.teacherId === "object" && "_id" in populated.teacherId ? (populated.teacherId as any)._id.toString() : populated?.teacherId?.toString() ?? null;

    // Create Audit Log
    await AuditLogModel.create({
      userId: req.user!.userId,
      userEmail: req.user!.email,
      action: "create_student",
      entity: "Student",
      entityId: student.id,
      details: `Created student ${student.firstName} ${student.lastName} (${studentNo})`,
    });

    res.status(201).json({
      ...student.toJSON(),
      parentId: parentIdStr,
      teacherId: teacherIdStr,
      parentName,
      teacherName,
      attendanceRate: null,
      averageScore: null,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to create student", error: err.message });
  }
});

// GET /students/:id - Get a single student
router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const user = req.user!;

  const student = await StudentModel.findById(rawId)
    .populate("parentId", "name email")
    .populate("teacherId", "name email");

  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return;
  }

  const parentIdStr = student.parentId
    ? ((student.parentId as any)._id?.toString() ?? student.parentId.toString())
    : null;
  const teacherIdStr = student.teacherId
    ? ((student.teacherId as any)._id?.toString() ?? student.teacherId.toString())
    : null;

  if (user.role === "parent" && parentIdStr !== user.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  if (user.role === "teacher" && teacherIdStr !== user.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  // Calculate attendance rate and average score
  const attendance = await AttendanceModel.find({ studentId: student._id });
  const totalAtt = attendance.length;
  const presentAtt = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 1000) / 10 : null;

  const grades = await ReportModel.find({ studentId: student._id, type: "grade", score: { $ne: null } });
  const totalScore = grades.reduce((acc, curr) => acc + (curr.score ?? 0), 0);
  const averageScore = grades.length > 0 ? Math.round((totalScore / grades.length) * 10) / 10 : null;

  const parentName = student.parentId && typeof student.parentId === "object" && "name" in student.parentId ? (student.parentId as any).name : null;
  const parentEmail = student.parentId && typeof student.parentId === "object" && "email" in student.parentId ? (student.parentId as any).email : null;
  const teacherName = student.teacherId && typeof student.teacherId === "object" && "name" in student.teacherId ? (student.teacherId as any).name : null;
  const teacherEmail = student.teacherId && typeof student.teacherId === "object" && "email" in student.teacherId ? (student.teacherId as any).email : null;

  res.json({
    ...student.toJSON(),
    parentId: parentIdStr,
    teacherId: teacherIdStr,
    parentName,
    parentEmail,
    teacherName,
    teacherEmail,
    attendanceRate,
    averageScore,
  });
});

// PUT /students/:id - Update student (Admin or teacher assigned)
router.put("/students/:id", requireAuth, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const user = req.user!;
    const student = await StudentModel.findById(rawId);

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Teacher can only update their assigned students
    if (user.role === "teacher" && student.teacherId?.toString() !== user.userId) {
      res.status(403).json({ message: "Forbidden: You are not assigned to this student." });
      return;
    }

    const { 
      firstName, 
      lastName, 
      grade, 
      dateOfBirth, 
      parentId, 
      teacherId,
      gender,
      address,
      faydaId,
      enrollmentStatus,
      medicalInfo,
      emergencyContact
    } = req.body;

    // Verify parent and teacher exist in the database if provided
    if (parentId && parentId !== student.parentId?.toString()) {
      const pExists = await UserModel.findOne({ _id: parentId, role: "parent" });
      if (!pExists) {
        res.status(400).json({ message: `Parent user with ID ${parentId} does not exist.` });
        return;
      }
    }
    if (teacherId && teacherId !== student.teacherId?.toString()) {
      const tExists = await UserModel.findOne({ _id: teacherId, role: "teacher" });
      if (!tExists) {
        res.status(400).json({ message: `Teacher user with ID ${teacherId} does not exist.` });
        return;
      }
    }

    const updateFields: Record<string, any> = {};
    if (firstName !== undefined) {
      if (!NAME_REGEX.test(firstName.trim())) {
        res.status(400).json({ message: "First name must contain only letters (no numbers or special characters)." });
        return;
      }
      updateFields.firstName = firstName.trim();
    }
    if (lastName !== undefined) {
      if (!NAME_REGEX.test(lastName.trim())) {
        res.status(400).json({ message: "Last name must contain only letters (no numbers or special characters)." });
        return;
      }
      updateFields.lastName = lastName.trim();
    }
    if (grade !== undefined) updateFields.grade = grade.trim();
    if (dateOfBirth !== undefined) {
      if (!isValidCalendarDate(dateOfBirth.trim())) {
        res.status(400).json({ message: "Date of birth must be a valid date in YYYY-MM-DD format." });
        return;
      }
      const age = getAgeYears(dateOfBirth.trim());
      if (age < 3 || age > 18) {
        res.status(400).json({ message: "Student must be between 3 and 18 years old." });
        return;
      }
      updateFields.dateOfBirth = dateOfBirth.trim();
    }
    if (parentId !== undefined) updateFields.parentId = parentId || null;
    if (teacherId !== undefined) updateFields.teacherId = teacherId || null;
    if (gender !== undefined) updateFields.gender = gender;
    if (address !== undefined) updateFields.address = address || null;
    if (faydaId !== undefined) {
      if (faydaId && !FAYDA_REGEX.test(faydaId.trim())) {
        res.status(400).json({ message: "Fayda ID must be exactly 12 digits (numbers only)." });
        return;
      }
      updateFields.faydaId = faydaId || null;
    }
    if (enrollmentStatus !== undefined) updateFields.enrollmentStatus = enrollmentStatus;
    if (medicalInfo !== undefined) updateFields.medicalInfo = medicalInfo || null;
    if (emergencyContact !== undefined) {
      if (emergencyContact) {
        const phone = extractPhone(emergencyContact);
        if (phone && !PHONE_REGEX.test(phone)) {
          res.status(400).json({ message: "Emergency contact phone must be in Ethiopian format: +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX." });
          return;
        }
      }
      updateFields.emergencyContact = emergencyContact || null;
    }

    const updated = await StudentModel.findByIdAndUpdate(rawId, updateFields, { new: true })
      .populate("parentId", "name")
      .populate("teacherId", "name");

    if (!updated) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Create Audit Log
    await AuditLogModel.create({
      userId: req.user!.userId,
      userEmail: req.user!.email,
      action: "update_student",
      entity: "Student",
      entityId: updated.id,
      details: `Updated student ${updated.firstName} ${updated.lastName} (${updated.studentNo})`,
    });

    const parentName = updated.parentId && typeof updated.parentId === "object" && "name" in updated.parentId ? (updated.parentId as any).name : null;
    const teacherName = updated.teacherId && typeof updated.teacherId === "object" && "name" in updated.teacherId ? (updated.teacherId as any).name : null;

    const parentIdStr = updated.parentId ? ((updated.parentId as any)._id?.toString() ?? (updated.parentId as any).toString()) : null;
    const teacherIdStr = updated.teacherId ? ((updated.teacherId as any)._id?.toString() ?? (updated.teacherId as any).toString()) : null;

    res.json({
      ...updated.toJSON(),
      parentId: parentIdStr,
      teacherId: teacherIdStr,
      parentName,
      teacherName,
      attendanceRate: null,
      averageScore: null,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update student", error: err.message });
  }
});

// DELETE /students/:id - Delete student (Admin only)
router.delete("/students/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const student = await StudentModel.findById(rawId);

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    await StudentModel.findByIdAndDelete(rawId);

    // Cascade delete related reports and attendance
    await ReportModel.deleteMany({ studentId: rawId });
    await AttendanceModel.deleteMany({ studentId: rawId });

    // Create Audit Log
    await AuditLogModel.create({
      userId: req.user!.userId,
      userEmail: req.user!.email,
      action: "delete_student",
      entity: "Student",
      entityId: rawId,
      details: `Deleted student ${student.firstName} ${student.lastName} (${student.studentNo}) and all related reports and attendance records.`,
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: "Failed to delete student", error: err.message });
  }
});

export default router;
