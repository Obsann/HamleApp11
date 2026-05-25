import bcrypt from "bcryptjs";
import {
  UserModel,
  StudentModel,
  ReportModel,
  AttendanceModel,
} from "@workspace/db";
import { logger } from "./logger";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

const TODAY = daysAgo(0);

export async function seedIfEmpty() {
  const existing = await UserModel.findOne();
  if (existing) return;

  logger.info("Seeding initial data...");
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const admin = await UserModel.create({
    name: "Abebe Girma",
    email: "admin@hamle.edu",
    passwordHash: await hash("admin123"),
    role: "admin",
  });

  const [t1, t2, t3] = await UserModel.insertMany([
    {
      name: "Tigist Alemu",
      email: "teacher@hamle.edu",
      passwordHash: await hash("teacher123"),
      role: "teacher",
    },
    {
      name: "Kebede Worku",
      email: "teacher2@hamle.edu",
      passwordHash: await hash("teacher123"),
      role: "teacher",
    },
    {
      name: "Almaz Tadesse",
      email: "teacher3@hamle.edu",
      passwordHash: await hash("teacher123"),
      role: "teacher",
    },
  ]);

  const parents = await UserModel.insertMany([
    {
      name: "Dawit Bekele",
      email: "parent@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
    {
      name: "Mekdes Haile",
      email: "parent2@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
    {
      name: "Girma Tesfaye",
      email: "parent3@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
    {
      name: "Hiwot Alem",
      email: "parent4@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
    {
      name: "Solomon Tadesse",
      email: "parent5@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
    {
      name: "Marta Gebre",
      email: "parent6@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
    {
      name: "Yohannes Kebede",
      email: "parent7@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
    {
      name: "Selamawit Worku",
      email: "parent8@hamle.edu",
      passwordHash: await hash("parent123"),
      role: "parent",
    },
  ]);

  const [p1, p2, p3, p4, p5, p6, p7, p8] = parents;

  const grade2 = await StudentModel.insertMany([
    {
      firstName: "Yonas",
      lastName: "Bekele",
      grade: "Grade 2",
      dateOfBirth: "2017-03-15",
      parentId: p1._id,
      teacherId: t1._id,
    },
    {
      firstName: "Hana",
      lastName: "Bekele",
      grade: "Grade 2",
      dateOfBirth: "2017-07-22",
      parentId: p1._id,
      teacherId: t1._id,
    },
    {
      firstName: "Sara",
      lastName: "Tesfaye",
      grade: "Grade 2",
      dateOfBirth: "2017-09-10",
      parentId: p3._id,
      teacherId: t1._id,
    },
    {
      firstName: "Abel",
      lastName: "Haile",
      grade: "Grade 2",
      dateOfBirth: "2017-12-01",
      parentId: p2._id,
      teacherId: t1._id,
    },
  ]);

  const grade3 = await StudentModel.insertMany([
    {
      firstName: "Biruk",
      lastName: "Haile",
      grade: "Grade 3",
      dateOfBirth: "2016-05-18",
      parentId: p2._id,
      teacherId: t2._id,
    },
    {
      firstName: "Liya",
      lastName: "Alem",
      grade: "Grade 3",
      dateOfBirth: "2016-02-25",
      parentId: p4._id,
      teacherId: t2._id,
    },
    {
      firstName: "Natnael",
      lastName: "Tadesse",
      grade: "Grade 3",
      dateOfBirth: "2016-08-14",
      parentId: p5._id,
      teacherId: t2._id,
    },
    {
      firstName: "Meron",
      lastName: "Gebre",
      grade: "Grade 3",
      dateOfBirth: "2016-11-30",
      parentId: p6._id,
      teacherId: t2._id,
    },
  ]);

  const grade4 = await StudentModel.insertMany([
    {
      firstName: "Selam",
      lastName: "Worku",
      grade: "Grade 4",
      dateOfBirth: "2015-04-07",
      parentId: p7._id,
      teacherId: t3._id,
    },
    {
      firstName: "Amir",
      lastName: "Kebede",
      grade: "Grade 4",
      dateOfBirth: "2015-06-19",
      parentId: p7._id,
      teacherId: t3._id,
    },
    {
      firstName: "Ruth",
      lastName: "Girma",
      grade: "Grade 4",
      dateOfBirth: "2015-10-03",
      parentId: p8._id,
      teacherId: t3._id,
    },
    {
      firstName: "Yosef",
      lastName: "Alemu",
      grade: "Grade 4",
      dateOfBirth: "2015-01-22",
      parentId: p3._id,
      teacherId: t3._id,
    },
  ]);

  const allStudents = [...grade2, ...grade3, ...grade4];

  const subjects = ["Mathematics", "Amharic", "English", "Science", "Social Studies"];
  const terms = ["Term 1", "Term 2"];
  const reportRows: any[] = [];

  const teacherFor = (s: any) =>
    grade2.some((x) => x._id.equals(s._id))
      ? t1._id
      : grade3.some((x) => x._id.equals(s._id))
      ? t2._id
      : t3._id;

  for (const student of allStudents) {
    const tid = teacherFor(student);
    for (const subject of subjects) {
      const base = 60 + Math.floor(Math.random() * 35);
      reportRows.push({
        studentId: student._id,
        teacherId: tid,
        subject,
        score: base,
        type: "grade",
        date: daysAgo(21),
        term: terms[0],
        notes:
          base >= 85
            ? "Excellent performance"
            : base >= 70
            ? "Satisfactory progress"
            : "Needs improvement",
      });
      reportRows.push({
        studentId: student._id,
        teacherId: tid,
        subject,
        score: Math.min(100, base + Math.floor(Math.random() * 10) - 3),
        type: "grade",
        date: daysAgo(7),
        term: terms[1],
      });
    }
    reportRows.push({
      studentId: student._id,
      teacherId: tid,
      subject: "Mathematics",
      score: 55 + Math.floor(Math.random() * 40),
      type: "assessment",
      date: daysAgo(14),
      term: terms[0],
      notes: "Mid-term assessment",
    });
    reportRows.push({
      studentId: student._id,
      teacherId: tid,
      subject: "English",
      score: 55 + Math.floor(Math.random() * 40),
      type: "assessment",
      date: daysAgo(3),
      term: terms[1],
    });
  }

  await ReportModel.insertMany(reportRows);

  const attendanceRows: any[] = [];
  const statusWeights = [
    "present",
    "present",
    "present",
    "present",
    "present",
    "present",
    "present",
    "present",
    "late",
    "absent",
  ];

  for (let day = 14; day >= 1; day--) {
    const d = new Date(Date.now() - day * 86400000);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const dateStr = d.toISOString().split("T")[0];

    for (const student of allStudents) {
      const tid = teacherFor(student);
      const status =
        statusWeights[Math.floor(Math.random() * statusWeights.length)];
      attendanceRows.push({
        studentId: student._id,
        teacherId: tid,
        date: dateStr,
        status,
        notes:
          status === "absent"
            ? "Parent notified"
            : status === "late"
            ? "Arrived 10 min late"
            : undefined,
      });
    }
  }

  for (const student of allStudents) {
    const tid = teacherFor(student);
    const status =
      statusWeights[Math.floor(Math.random() * statusWeights.length)];
    attendanceRows.push({
      studentId: student._id,
      teacherId: tid,
      date: TODAY,
      status,
      notes:
        status === "absent"
          ? "Parent notified"
          : status === "late"
          ? "Arrived late"
          : undefined,
    });
  }

  await AttendanceModel.insertMany(attendanceRows);

  void admin;

  logger.info(
    "Seeding complete. Accounts: admin@hamle.edu/admin123 | teacher@hamle.edu/teacher123 | teacher2@hamle.edu/teacher123 | parent@hamle.edu/parent123"
  );
}
