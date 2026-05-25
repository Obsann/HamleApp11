import { Router, type IRouter } from "express";
import { StudentModel, AttendanceModel, ReportModel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  if (user.role === "admin") {
    const total = await StudentModel.countDocuments();
    const presentToday = await AttendanceModel.countDocuments({
      date: today,
      status: "present",
    });
    const absentToday = await AttendanceModel.countDocuments({
      date: today,
      status: "absent",
    });
    const recentReports = await ReportModel.countDocuments({
      date: { $gte: sevenDaysAgo },
    });

    const allAttendance = await AttendanceModel.find().select("status");
    const presentCount = allAttendance.filter(
      (a) => a.status === "present"
    ).length;
    const rate =
      allAttendance.length > 0
        ? (presentCount / allAttendance.length) * 100
        : 100;

    res.json({
      totalStudents: total,
      presentToday,
      absentToday,
      recentReports,
      attendanceRate: Math.round(rate * 10) / 10,
      myStudents: null,
    });
  } else if (user.role === "teacher") {
    const myStudents = await StudentModel.find({
      teacherId: user.userId,
    }).select("_id");
    const myCount = myStudents.length;
    const myIds = myStudents.map((s) => s._id);

    const presentToday = await AttendanceModel.countDocuments({
      studentId: { $in: myIds },
      date: today,
      status: "present",
    });
    const absentToday = await AttendanceModel.countDocuments({
      studentId: { $in: myIds },
      date: today,
      status: "absent",
    });
    const recentReports = await ReportModel.countDocuments({
      teacherId: user.userId,
      date: { $gte: sevenDaysAgo },
    });

    res.json({
      totalStudents: myCount,
      presentToday,
      absentToday,
      recentReports,
      attendanceRate:
        myCount > 0
          ? Math.round((presentToday / myCount) * 1000) / 10
          : 100,
      myStudents: myCount,
    });
  } else {
    const myStudents = await StudentModel.find({
      parentId: user.userId,
    }).select("_id");
    const myIds = myStudents.map((s) => s._id);

    const presentToday = await AttendanceModel.countDocuments({
      studentId: { $in: myIds },
      date: today,
      status: "present",
    });
    const absentToday = await AttendanceModel.countDocuments({
      studentId: { $in: myIds },
      date: today,
      status: "absent",
    });
    const recentReports = await ReportModel.countDocuments({
      studentId: { $in: myIds },
      date: { $gte: sevenDaysAgo },
    });

    res.json({
      totalStudents: myStudents.length,
      presentToday,
      absentToday,
      recentReports,
      attendanceRate:
        myStudents.length > 0
          ? Math.round((presentToday / myStudents.length) * 1000) / 10
          : 100,
      myStudents: myStudents.length,
    });
  }
});

export default router;
