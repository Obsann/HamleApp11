import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useGetAttendance, useGetStudents } from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8",
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  present: { color: "#16A34A", bg: "#DCFCE7", label: "Present" },
  absent: { color: "#DC2626", bg: "#FEE2E2", label: "Absent" },
  late: { color: "#D97706", bg: "#FEF3C7", label: "Late" },
};

const GRADE_COLORS = [
  "#1B3D7A", "#7C3AED", "#16A34A", "#D97706",
  "#DC2626", "#0891B2", "#9D174D", "#065F46",
];

export default function AttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === "admin" || user?.role === "teacher";

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const { data: attendance, isLoading: loadingAtt, refetch, isRefetching } = useGetAttendance();
  const { data: students, isLoading: loadingStudents } = useGetStudents();

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const studentGradeMap = useMemo(() => {
    const map = new Map<string, string>();
    students?.forEach((s) => map.set(s.id, s.grade));
    return map;
  }, [students]);

  const studentsByGrade = useMemo(() => {
    const map = new Map<string, Student[]>();
    GRADES.forEach((g) => map.set(g, []));
    students?.forEach((s) => {
      const list = map.get(s.grade) ?? [];
      list.push(s);
      map.set(s.grade, list);
    });
    return map;
  }, [students]);

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; late: number; latest: string | null }>();
    attendance?.forEach((a) => {
      const curr = map.get(a.studentId) ?? { present: 0, absent: 0, late: 0, latest: null };
      const status = a.status as "present" | "absent" | "late";
      if (status === "present" || status === "absent" || status === "late") {
        curr[status] += 1;
        if (!curr.latest || a.date > curr.latest) curr.latest = status;
        map.set(a.studentId, curr);
      }
    });
    return map;
  }, [attendance]);

  const gradeStats = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; late: number; total: number }>();
    GRADES.forEach((g) => map.set(g, { present: 0, absent: 0, late: 0, total: 0 }));
    attendance?.forEach((a) => {
      const grade = studentGradeMap.get(a.studentId);
      if (!grade) return;
      const curr = map.get(grade) ?? { present: 0, absent: 0, late: 0, total: 0 };
      const status = a.status as "present" | "absent" | "late";
      if (status === "present" || status === "absent" || status === "late") {
        curr[status] += 1;
        curr.total += 1;
        map.set(grade, curr);
      }
    });
    return map;
  }, [attendance, studentGradeMap]);

  const visibleGrades = useMemo(() => {
    if (user?.role === "admin") return GRADES;
    const activeGrades = new Set<string>();
    students?.forEach((s) => activeGrades.add(s.grade));
    return GRADES.filter((g) => activeGrades.has(g));
  }, [user, students]);

  const isLoading = loadingAtt || loadingStudents;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>Attendance</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {selectedGrade ? (
        (() => {
          const gradeStudents = studentsByGrade.get(selectedGrade) ?? [];
          const gradeIdx = GRADES.indexOf(selectedGrade);
          const accentColor = GRADE_COLORS[gradeIdx % GRADE_COLORS.length]!;

          return (
            <View key="student-list-container" style={{ flex: 1 }}>
              <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <TouchableOpacity onPress={() => setSelectedGrade(null)} style={{ padding: 4 }}>
                      <Feather name="arrow-left" size={22} color={colors.foreground} />
                    </TouchableOpacity>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accentColor }} />
                      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground }}>{selectedGrade}</Text>
                    </View>
                  </View>
                  {isTeacherOrAdmin && (
                    <TouchableOpacity
                      style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/add-attendance"); }}
                    >
                      <Feather name="plus" size={16} color="#fff" />
                      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Record</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 6, marginLeft: 36 }}>
                  {gradeStudents.length} student{gradeStudents.length !== 1 ? "s" : ""}
                </Text>
              </View>

              <FlatList
                key="students-flatlist"
                data={gradeStudents}
                keyExtractor={(s) => s.id ?? String((s as any).studentNo ?? Math.random())}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", marginTop: 60 }}>
                    <Feather name="users" size={40} color={colors.mutedForeground} />
                    <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 12 }}>
                      No students in {selectedGrade}
                    </Text>
                  </View>
                }
                renderItem={({ item: s }) => {
                  const stats = attendanceByStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, latest: null };
                  const total = stats.present + stats.absent + stats.late;
                  const presentPct = total > 0 ? Math.round((stats.present / total) * 100) : null;
                  const initials = `${s.firstName?.[0] ?? ""}${s.lastName?.[0] ?? ""}`.toUpperCase() || "?";

                  return (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/student/${s.id}` as any); }}
                      style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: accentColor, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" }}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{s.firstName} {s.lastName}</Text>
                          {total > 0 && (
                            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                              {total} record{total !== 1 ? "s" : ""}
                              {presentPct !== null ? ` · ${presentPct}% present` : ""}
                            </Text>
                          )}
                        </View>
                        {presentPct !== null && (
                          <View style={{ backgroundColor: presentPct >= 75 ? "#DCFCE7" : presentPct >= 50 ? "#FEF3C7" : "#FEE2E2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: presentPct >= 75 ? "#16A34A" : presentPct >= 50 ? "#D97706" : "#DC2626" }}>
                              {presentPct}%
                            </Text>
                          </View>
                        )}
                      </View>
                      {total > 0 ? (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {(["present", "absent", "late"] as const).map((status) => {
                            const cfg = STATUS_CONFIG[status]!;
                            return (
                              <View key={status} style={{ flex: 1, backgroundColor: cfg.bg, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}>
                                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: cfg.color }}>{stats[status]}</Text>
                                <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: cfg.color, marginTop: 2 }}>{cfg.label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={{ backgroundColor: colors.secondary, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>No records yet — tap to view profile</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          );
        })()
      ) : (
        <View key="grade-grid-container" style={{ flex: 1 }}>
          <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>Attendance</Text>
              {isTeacherOrAdmin && (
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/add-attendance"); }}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Record</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            key="grades-grid"
            data={visibleGrades}
            keyExtractor={(g) => g}
            numColumns={2}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
            columnWrapperStyle={{ gap: 12 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: grade, index }) => {
              const stats = gradeStats.get(grade) ?? { present: 0, absent: 0, late: 0, total: 0 };
              const studentList = studentsByGrade.get(grade) ?? [];
              const studentCount = studentList.length;
              const presentPct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : null;
              const accentColor = GRADE_COLORS[index % GRADE_COLORS.length]!;

              return (
                <TouchableOpacity
                  style={{
                    flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 16,
                    marginBottom: 12,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
                    borderLeftWidth: 4, borderLeftColor: accentColor,
                  }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedGrade(grade);
                  }}
                  activeOpacity={0.82}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground }}>{grade}</Text>
                    <View style={{ backgroundColor: accentColor + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: accentColor }}>
                        {studentCount}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 10 }}>
                    {studentCount === 1 ? "1 student" : `${studentCount} students`}
                  </Text>
                  {stats.total > 0 ? (
                    <>
                      <View style={{ height: 5, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                        <View style={{ height: 5, width: `${presentPct ?? 0}%` as any, backgroundColor: "#16A34A", borderRadius: 3 }} />
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#16A34A" }}>✓ {stats.present}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#DC2626" }}>✗ {stats.absent}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#D97706" }}>⏱ {stats.late}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>No records yet</Text>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}
