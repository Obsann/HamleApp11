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
  const adminPassword = await hash("admin123");
  const teacherPassword = await hash("teacher123");
  const parentPassword = await hash("parent123");

  const admin = await UserModel.create({
    name: "Admin User",
    email: "admin@hamle.edu",
    recoveryEmail: "admin@hamle.edu",
    passwordHash: adminPassword,
    role: "admin",
  });

  const [t1, t2, t3] = await UserModel.insertMany([
    {
      name: "Abebe Kebede",
      email: "teacher@hamle.edu",
      recoveryEmail: "teacher@hamle.edu",
      passwordHash: teacherPassword,
      role: "teacher",
    },
    {
      name: "Tigist Alemu",
      email: "teacher2@hamle.edu",
      recoveryEmail: "teacher2@hamle.edu",
      passwordHash: teacherPassword,
      role: "teacher",
    },
    {
      name: "Aster Bekele",
      email: "teacher3@hamle.edu",
      recoveryEmail: "teacher3@hamle.edu",
      passwordHash: teacherPassword,
      role: "teacher",
    },
  ]);

  const parents = await UserModel.insertMany([
    {
      name: "Dawit Tadesse",
      email: "parent@hamle.edu",
      recoveryEmail: "parent@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
    {
      name: "Makeda Solomon",
      email: "parent2@hamle.edu",
      recoveryEmail: "parent2@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
    {
      name: "Yonas Mekonnen",
      email: "parent3@hamle.edu",
      recoveryEmail: "parent3@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
    {
      name: "Senait Hailu",
      email: "parent4@hamle.edu",
      recoveryEmail: "parent4@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
    {
      name: "Bruk Worku",
      email: "parent5@hamle.edu",
      recoveryEmail: "parent5@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
    {
      name: "Chala Daba",
      email: "parent6@hamle.edu",
      recoveryEmail: "parent6@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
    {
      name: "Fasika Girma",
      email: "parent7@hamle.edu",
      recoveryEmail: "parent7@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
    {
      name: "Gemechu Tulu",
      email: "parent8@hamle.edu",
      recoveryEmail: "parent8@hamle.edu",
      passwordHash: parentPassword,
      role: "parent",
    },
  ]);

  const [p1, p2, p3, p4, p5, p6, p7, p8] = parents;

  const grade2 = await StudentModel.insertMany([
    {
      firstName: "Yonas",
      lastName: "Dawit",
      grade: "Grade 2",
      dateOfBirth: "2017-03-15",
      parentId: p1._id,
      teacherId: t1._id,
      studentNo: "ST0001",
      gender: "male",
      faydaId: "ET-010000000001",
      address: { region: "Addis Ababa", zone: "Bole", kebele: "03", houseNo: "123" },
      enrollmentStatus: "active",
      medicalInfo: "No known drug allergies",
      emergencyContact: "+251-911-234567 (Dawit Bekele)",
    },
    {
      firstName: "Hana",
      lastName: "Dawit",
      grade: "Grade 2",
      dateOfBirth: "2017-07-22",
      parentId: p1._id,
      teacherId: t1._id,
      studentNo: "ST0002",
      gender: "female",
      faydaId: "ET-010000000002",
      address: { region: "Addis Ababa", zone: "Bole", kebele: "03", houseNo: "123" },
      enrollmentStatus: "active",
      medicalInfo: "Lactose intolerant",
      emergencyContact: "+251-911-234567 (Dawit Bekele)",
    },
    {
      firstName: "Sara",
      lastName: "Yonas",
      grade: "Grade 2",
      dateOfBirth: "2017-09-10",
      parentId: p3._id,
      teacherId: t1._id,
      studentNo: "ST0003",
      gender: "female",
      faydaId: "ET-010000000003",
      address: { region: "Addis Ababa", zone: "Yeka", kebele: "05", houseNo: "405" },
      enrollmentStatus: "active",
      medicalInfo: null,
      emergencyContact: "+251-911-876543 (Girma Tesfaye)",
    },
    {
      firstName: "Abel",
      lastName: "Makeda",
      grade: "Grade 2",
      dateOfBirth: "2017-12-01",
      parentId: p2._id,
      teacherId: t1._id,
      studentNo: "ST0004",
      gender: "male",
      faydaId: "ET-010000000004",
      address: { region: "Addis Ababa", zone: "Kirkos", kebele: "11", houseNo: "90" },
      enrollmentStatus: "active",
      medicalInfo: "Asthma - inhaler in backpack",
      emergencyContact: "+251-912-345678 (Mekdes Haile)",
    },
  ]);

  const grade3 = await StudentModel.insertMany([
    {
      firstName: "Biruk",
      lastName: "Makeda",
      grade: "Grade 3",
      dateOfBirth: "2016-05-18",
      parentId: p2._id,
      teacherId: t2._id,
      studentNo: "ST0005",
      gender: "male",
      faydaId: "ET-010000000005",
      address: { region: "Addis Ababa", zone: "Kirkos", kebele: "11", houseNo: "90" },
      enrollmentStatus: "active",
      medicalInfo: null,
      emergencyContact: "+251-912-345678 (Mekdes Haile)",
    },
    {
      firstName: "Liya",
      lastName: "Senait",
      grade: "Grade 3",
      dateOfBirth: "2016-02-25",
      parentId: p4._id,
      teacherId: t2._id,
      studentNo: "ST0006",
      gender: "female",
      faydaId: "ET-010000000006",
      address: { region: "Addis Ababa", zone: "Nifas Silk", kebele: "08", houseNo: "411" },
      enrollmentStatus: "active",
      medicalInfo: "Mild peanut allergy",
      emergencyContact: "+251-913-456789 (Hiwot Alem)",
    },
    {
      firstName: "Natnael",
      lastName: "Bruk",
      grade: "Grade 3",
      dateOfBirth: "2016-08-14",
      parentId: p5._id,
      teacherId: t2._id,
      studentNo: "ST0007",
      gender: "male",
      faydaId: "ET-010000000007",
      address: { region: "Addis Ababa", zone: "Kolfe Keranio", kebele: "09", houseNo: "202" },
      enrollmentStatus: "active",
      medicalInfo: null,
      emergencyContact: "+251-914-567890 (Solomon Tadesse)",
    },
    {
      firstName: "Meron",
      lastName: "Chala",
      grade: "Grade 3",
      dateOfBirth: "2016-11-30",
      parentId: p6._id,
      teacherId: t2._id,
      studentNo: "ST0008",
      gender: "female",
      faydaId: "ET-010000000008",
      address: { region: "Addis Ababa", zone: "Lideta", kebele: "02", houseNo: "18" },
      enrollmentStatus: "active",
      medicalInfo: null,
      emergencyContact: "+251-915-678901 (Marta Gebre)",
    },
  ]);

  const grade4 = await StudentModel.insertMany([
    {
      firstName: "Selam",
      lastName: "Fasika",
      grade: "Grade 4",
      dateOfBirth: "2015-04-07",
      parentId: p7._id,
      teacherId: t3._id,
      studentNo: "ST0009",
      gender: "female",
      faydaId: "ET-010000000009",
      address: { region: "Addis Ababa", zone: "Gullele", kebele: "06", houseNo: "88" },
      enrollmentStatus: "active",
      medicalInfo: null,
      emergencyContact: "+251-916-789012 (Yohannes Kebede)",
    },
    {
      firstName: "Amir",
      lastName: "Fasika",
      grade: "Grade 4",
      dateOfBirth: "2015-06-19",
      parentId: p7._id,
      teacherId: t3._id,
      studentNo: "ST0010",
      gender: "male",
      faydaId: "ET-010000000010",
      address: { region: "Addis Ababa", zone: "Gullele", kebele: "06", houseNo: "88" },
      enrollmentStatus: "active",
      medicalInfo: null,
      emergencyContact: "+251-916-789012 (Yohannes Kebede)",
    },
    {
      firstName: "Ruth",
      lastName: "Gemechu",
      grade: "Grade 4",
      dateOfBirth: "2015-10-03",
      parentId: p8._id,
      teacherId: t3._id,
      studentNo: "ST0011",
      gender: "female",
      faydaId: "ET-010000000011",
      address: { region: "Addis Ababa", zone: "Akaki Kality", kebele: "04", houseNo: "77" },
      enrollmentStatus: "active",
      medicalInfo: null,
      emergencyContact: "+251-917-890123 (Selamawit Worku)",
    },
    {
      firstName: "Yosef",
      lastName: "Yonas",
      grade: "Grade 4",
      dateOfBirth: "2015-01-22",
      parentId: p3._id,
      teacherId: t3._id,
      studentNo: "ST0012",
      gender: "male",
      faydaId: "ET-010000000012",
      address: { region: "Addis Ababa", zone: "Yeka", kebele: "05", houseNo: "405" },
      enrollmentStatus: "active",
      medicalInfo: "Penicillin allergy",
      emergencyContact: "+251-911-876543 (Girma Tesfaye)",
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

  /**
   * Generate a grade-type report row.
   * Since insertMany() bypasses pre-save hooks, we must manually compute
   * score = midExam + tests + continuousAssessment + finalExam
   * so that both the components and the total are always in sync.
   */
  function makeGradeReport(
    studentId: any,
    teacherId: any,
    subject: string,
    term: string,
    date: string,
    notes?: string
  ) {
    // Each component out of 25 → total out of 100
    const mid  = 10 + Math.floor(Math.random() * 16); // 10–25
    const test = 8  + Math.floor(Math.random() * 13); // 8–20
    const ca   = 5  + Math.floor(Math.random() * 11); // 5–15
    // final fills up to leave a believable total (40–100 range)
    const maxFinal = Math.min(40, 100 - mid - test - ca);
    const final = Math.max(5, maxFinal - Math.floor(Math.random() * 10));
    const score = mid + test + ca + final;
    return {
      studentId,
      teacherId,
      subject,
      score,
      midExam: mid,
      tests: test,
      continuousAssessment: ca,
      finalExam: final,
      status: score >= 50 ? "Pass" : "Fail",
      type: "grade",
      date,
      term,
      notes: notes ?? (score >= 85 ? "Excellent performance" : score >= 70 ? "Satisfactory progress" : "Needs improvement"),
    };
  }

  for (const student of allStudents) {
    const tid = teacherFor(student);
    for (const subject of subjects) {
      reportRows.push(makeGradeReport(student._id, tid, subject, terms[0]!, daysAgo(21)));
      reportRows.push(makeGradeReport(student._id, tid, subject, terms[1]!, daysAgo(7)));
    }
    // Assessment-type: direct score, components are null (no hook computation needed)
    const mathAssessScore = 55 + Math.floor(Math.random() * 40);
    reportRows.push({
      studentId: student._id,
      teacherId: tid,
      subject: "Mathematics",
      score: mathAssessScore,
      midExam: null,
      tests: null,
      continuousAssessment: null,
      finalExam: null,
      status: mathAssessScore >= 50 ? "Pass" : "Fail",
      type: "assessment",
      date: daysAgo(14),
      term: terms[0],
      notes: "Mid-term assessment",
    });
    const engAssessScore = 55 + Math.floor(Math.random() * 40);
    reportRows.push({
      studentId: student._id,
      teacherId: tid,
      subject: "English",
      score: engAssessScore,
      midExam: null,
      tests: null,
      continuousAssessment: null,
      finalExam: null,
      status: engAssessScore >= 50 ? "Pass" : "Fail",
      type: "assessment",
      date: daysAgo(3),
      term: terms[1],
      notes: "End-of-term reading assessment",
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
