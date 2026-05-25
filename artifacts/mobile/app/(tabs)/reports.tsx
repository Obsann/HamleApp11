import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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
import { useGetReports } from "@workspace/api-client-react";
import type { Report } from "@workspace/api-client-react";

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  grade: { bg: "#E8EEF8", text: "#1B3D7A", label: "Grade" },
  assessment: { bg: "#FEF3C7", text: "#D97706", label: "Assessment" },
  attendance: { bg: "#DCFCE7", text: "#16A34A", label: "Attendance" },
};

function ReportCard({ report }: { report: Report }) {
  const colors = useColors();
  const typeInfo = TYPE_COLORS[report.type] ?? TYPE_COLORS["grade"];

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card }]}>
      <View style={cardStyles.header}>
        <Text style={[cardStyles.studentName, { color: colors.foreground }]}>{report.studentName}</Text>
        <View style={[cardStyles.typeBadge, { backgroundColor: typeInfo.bg }]}>
          <Text style={[cardStyles.typeBadgeText, { color: typeInfo.text }]}>{typeInfo.label}</Text>
        </View>
      </View>
      <Text style={[cardStyles.subject, { color: colors.mutedForeground }]}>{report.subject}</Text>
      <View style={cardStyles.footer}>
        {report.score != null && (
          <View style={[cardStyles.scoreBadge, { backgroundColor: colors.primary }]}>
            <Text style={cardStyles.scoreText}>{report.score}</Text>
          </View>
        )}
        <Text style={[cardStyles.date, { color: colors.mutedForeground }]}>{report.date}</Text>
        {report.term && <Text style={[cardStyles.term, { color: colors.mutedForeground }]}>{report.term}</Text>}
      </View>
      {report.notes && (
        <Text style={[cardStyles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>{report.notes}</Text>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  studentName: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  subject: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 10 },
  footer: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  date: { fontSize: 13, fontFamily: "Inter_400Regular" },
  term: { fontSize: 13, fontFamily: "Inter_500Medium" },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
});

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "grade" | "assessment" | "attendance">("all");

  const { data: reports, isLoading, refetch, isRefetching } = useGetReports();

  const filtered = (reports ?? []).filter((r) => filter === "all" || r.type === filter);
  const isTeacherOrAdmin = user?.role === "admin" || user?.role === "teacher";
  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const filters: Array<{ key: typeof filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "grade", label: "Grades" },
    { key: "assessment", label: "Assessments" },
    { key: "attendance", label: "Attendance" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>Reports</Text>
          {isTeacherOrAdmin && (
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/add-report"); }}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: filter === f.key ? colors.primary : colors.secondary,
              }}
              onPress={() => setFilter(f.key)}
            >
              <Text style={{
                fontSize: 13, fontFamily: "Inter_600SemiBold",
                color: filter === f.key ? "#fff" : colors.foreground,
              }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReportCard report={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Feather name="file-text" size={40} color={colors.mutedForeground} />
              <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 12 }}>
                No reports found
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          scrollEnabled={!!filtered.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
