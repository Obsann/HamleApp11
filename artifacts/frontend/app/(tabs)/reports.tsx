import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useGetReports, useGetStudents } from "@workspace/api-client-react";
import type { Report } from "@workspace/api-client-react";

import AnimatedTouchable from "@/components/AnimatedTouchable";
import { SkeletonList } from "@/components/SkeletonLoader";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8",
];

const TYPE_FILTERS = [
  { key: "all" as const, label: "All" },
  { key: "grade" as const, label: "Grades" },
  { key: "assessment" as const, label: "Assessments" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  grade: { bg: "#E8EEF8", text: "#1B3D7A", label: "Grade" },
  assessment: { bg: "#FEF3C7", text: "#D97706", label: "Assessment" },
  attendance: { bg: "#DCFCE7", text: "#16A34A", label: "Attendance" },
};

const CHART_COLORS = ["#1B3D7A", "#7C3AED", "#16A34A", "#D97706", "#DC2626", "#0891B2"];

function ReportCard({ report }: { report: Report }) {
  const colors = useColors();
  const router = useRouter();
  const typeInfo = TYPE_COLORS[report.type] ?? TYPE_COLORS["grade"]!;
  const isPass = report.status === "Pass";
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <AnimatedTouchable
          onPress={() => router.push(`/student/${report.studentId}` as any)}
          activeScale={0.96}
          style={{ flex: 1, marginRight: 8 }}
        >
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primary }}>
            {report.studentName}
          </Text>
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>
            Tap to view student profile
          </Text>
        </AnimatedTouchable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {report.status && (
            <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: isPass ? "#D1FAE5" : "#FEE2E2" }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: isPass ? "#065F46" : "#991B1B" }}>
                {report.status.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: typeInfo.bg }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: typeInfo.text }}>{typeInfo.label}</Text>
          </View>
        </View>
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 8 }}>{report.subject}</Text>

      {report.type === "grade" && report.midExam != null && (
        <View style={{ backgroundColor: colors.secondary + "50", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Mid Exam:</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{report.midExam} pts</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Tests:</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{report.tests} pts</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Continuous Assessment:</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{report.continuousAssessment} pts</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Final Exam:</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{report.finalExam} pts</Text>
          </View>
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {report.score != null && (
          <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: isPass ? "#10B981" : colors.primary }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" }}>Score: {report.score}</Text>
          </View>
        )}
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{report.date}</Text>
        {report.term && <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{report.term}</Text>}
      </View>
      {report.notes && (
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 8 }} numberOfLines={2}>{report.notes}</Text>
      )}
    </View>
  );
}

function SubjectChart({ reports }: { reports: Report[] }) {
  const colors = useColors();
  const stats = useMemo(() => {
    const bySubject = new Map<string, { total: number; count: number }>();
    reports.forEach((r) => {
      if (r.score != null) {
        const curr = bySubject.get(r.subject) ?? { total: 0, count: 0 };
        bySubject.set(r.subject, { total: curr.total + r.score, count: curr.count + 1 });
      }
    });
    return Array.from(bySubject.entries())
      .map(([subject, { total, count }]) => ({ subject, avg: Math.round(total / count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [reports]);

  if (stats.length === 0) return null;

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 14 }}>Subject Performance</Text>
      {stats.map(({ subject, avg }, i) => (
        <View key={subject} style={{ marginBottom: i < stats.length - 1 ? 12 : 0 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, flex: 1 }} numberOfLines={1}>{subject}</Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: CHART_COLORS[i % CHART_COLORS.length], marginLeft: 8 }}>{avg}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: colors.secondary, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: 8, width: `${avg}%` as any, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "grade" | "assessment">("all");

  const { data: reports, isLoading: loadingReports, refetch, isRefetching } = useGetReports();
  const { data: students } = useGetStudents();

  const isTeacherOrAdmin = user?.role === "admin" || user?.role === "teacher";
  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const studentGradeMap = useMemo(() => {
    const map = new Map<string, string>();
    students?.forEach((s) => map.set(s.id, s.grade));
    return map;
  }, [students]);

  const gradeReports = useMemo(() => {
    if (!selectedGrade) return reports ?? [];
    return (reports ?? []).filter((r) => studentGradeMap.get(r.studentId) === selectedGrade);
  }, [reports, selectedGrade, studentGradeMap]);

  const filteredReports = useMemo(() => {
    if (typeFilter === "all") return gradeReports;
    return gradeReports.filter((r) => r.type === typeFilter);
  }, [gradeReports, typeFilter]);

  const gradeReportCount = useMemo(() => {
    const map = new Map<string, number>();
    (reports ?? []).forEach((r) => {
      const g = studentGradeMap.get(r.studentId);
      if (g) map.set(g, (map.get(g) ?? 0) + 1);
    });
    return map;
  }, [reports, studentGradeMap]);

  const visibleGrades = useMemo(() => {
    if (user?.role === "admin") return GRADES;
    const activeGrades = new Set<string>();
    students?.forEach((s) => activeGrades.add(s.grade));
    return GRADES.filter((g) => activeGrades.has(g));
  }, [user, students]);

  const ListHeader = (
    <View style={{ paddingTop: top + 16, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>Reports</Text>
        {isTeacherOrAdmin && (
          <AnimatedTouchable
            style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}
            onPress={() => { router.push("/add-report"); }}
            activeScale={0.9}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Add</Text>
          </AnimatedTouchable>
        )}
      </View>

      <SubjectChart reports={gradeReports} />

      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 10 }}>By Grade</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <AnimatedTouchable
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
            backgroundColor: selectedGrade === null ? colors.primary : colors.secondary,
            flex: 0,
          }}
          onPress={() => { setSelectedGrade(null); setTypeFilter("all"); }}
          activeScale={0.9}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: selectedGrade === null ? "#fff" : colors.foreground }}>
            All Grades
          </Text>
        </AnimatedTouchable>
        {visibleGrades.map((g) => {
          const count = gradeReportCount.get(g) ?? 0;
          const isSelected = selectedGrade === g;
          return (
            <AnimatedTouchable
              key={g}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: isSelected ? colors.primary : colors.secondary,
                opacity: count === 0 ? 0.45 : 1,
                flex: 0,
              }}
              onPress={() => {
                if (count > 0) {
                  setSelectedGrade(isSelected ? null : g);
                  setTypeFilter("all");
                }
              }}
              activeScale={count === 0 ? 1 : 0.9}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: isSelected ? "#fff" : colors.foreground }}>
                {g.replace("Grade ", "G")}
                {count > 0 ? ` · ${count}` : ""}
              </Text>
            </AnimatedTouchable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {TYPE_FILTERS.map((f) => (
          <AnimatedTouchable
            key={f.key}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: typeFilter === f.key ? colors.primary : colors.secondary,
              flex: 0,
            }}
            onPress={() => setTypeFilter(f.key)}
            activeScale={0.9}
          >
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: typeFilter === f.key ? "#fff" : colors.foreground }}>
              {f.label}
            </Text>
          </AnimatedTouchable>
        ))}
      </View>

      {selectedGrade && (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}>
          <Feather name="filter" size={14} color={colors.primary} />
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.primary }}>
            Showing: {selectedGrade}
          </Text>
          <AnimatedTouchable onPress={() => { setSelectedGrade(null); setTypeFilter("all"); }} activeScale={0.9}>
            <Feather name="x-circle" size={15} color={colors.mutedForeground} />
          </AnimatedTouchable>
        </View>
      )}
    </View>
  );

  if (loadingReports) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {ListHeader}
        <View style={{ marginTop: 20 }}>
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={filteredReports}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ReportCard report={item} />}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
      ListEmptyComponent={
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Feather name="file-text" size={40} color={colors.mutedForeground} />
          <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 12 }}>
            No reports found
          </Text>
        </View>
      }
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      showsVerticalScrollIndicator={false}
    />
  );
}
