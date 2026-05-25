import { Router, type IRouter } from "express";
import { db, studentsTable, attendanceTable, reportsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (user.role === "admin") {
    const allStudents = await db.select({ id: studentsTable.id }).from(studentsTable);
    const total = allStudents.length;

    const presentRows = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.date, today), eq(attendanceTable.status, "present")));
    const absentRows = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.date, today), eq(attendanceTable.status, "absent")));

    const recentReports = await db
      .select({ id: reportsTable.id })
      .from(reportsTable)
      .where(gte(reportsTable.date, sevenDaysAgo));

    const allAttendance = await db.select({ status: attendanceTable.status }).from(attendanceTable);
    const presentCount = allAttendance.filter((a) => a.status === "present").length;
    const rate = allAttendance.length > 0 ? (presentCount / allAttendance.length) * 100 : 100;

    res.json({
      totalStudents: total,
      presentToday: presentRows.length,
      absentToday: absentRows.length,
      recentReports: recentReports.length,
      attendanceRate: Math.round(rate * 10) / 10,
      myStudents: null,
    });
  } else if (user.role === "teacher") {
    const myStudents = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.teacherId, user.userId));
    const myCount = myStudents.length;
    const myIds = myStudents.map((s) => s.id);

    let presentToday = 0;
    let absentToday = 0;
    for (const id of myIds) {
      const rows = await db
        .select()
        .from(attendanceTable)
        .where(and(eq(attendanceTable.studentId, id), eq(attendanceTable.date, today)));
      for (const r of rows) {
        if (r.status === "present") presentToday++;
        else if (r.status === "absent") absentToday++;
      }
    }

    const recentReports = await db
      .select({ id: reportsTable.id })
      .from(reportsTable)
      .where(and(eq(reportsTable.teacherId, user.userId), gte(reportsTable.date, sevenDaysAgo)));

    res.json({
      totalStudents: myCount,
      presentToday,
      absentToday,
      recentReports: recentReports.length,
      attendanceRate: myCount > 0 ? Math.round((presentToday / myCount) * 1000) / 10 : 100,
      myStudents: myCount,
    });
  } else {
    const myStudents = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.parentId, user.userId));

    let presentToday = 0;
    let absentToday = 0;
    let recentReportsCount = 0;

    for (const s of myStudents) {
      const att = await db
        .select()
        .from(attendanceTable)
        .where(and(eq(attendanceTable.studentId, s.id), eq(attendanceTable.date, today)));
      for (const r of att) {
        if (r.status === "present") presentToday++;
        else if (r.status === "absent") absentToday++;
      }
      const rep = await db
        .select({ id: reportsTable.id })
        .from(reportsTable)
        .where(and(eq(reportsTable.studentId, s.id), gte(reportsTable.date, sevenDaysAgo)));
      recentReportsCount += rep.length;
    }

    res.json({
      totalStudents: myStudents.length,
      presentToday,
      absentToday,
      recentReports: recentReportsCount,
      attendanceRate: myStudents.length > 0 ? Math.round((presentToday / myStudents.length) * 1000) / 10 : 100,
      myStudents: myStudents.length,
    });
  }
});

export default router;
