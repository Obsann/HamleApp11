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
import { useGetAttendance } from "@workspace/api-client-react";
import type { Attendance } from "@workspace/api-client-react";

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  present: { icon: "check-circle", color: "#16A34A", bg: "#DCFCE7", label: "Present" },
  absent: { icon: "x-circle", color: "#DC2626", bg: "#FEE2E2", label: "Absent" },
  late: { icon: "clock", color: "#D97706", bg: "#FEF3C7", label: "Late" },
};

function AttendanceCard({ record }: { record: Attendance }) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[record.status] ?? STATUS_CONFIG["present"];

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card }]}>
      <View style={[cardStyles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Feather name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={cardStyles.info}>
        <Text style={[cardStyles.studentName, { color: colors.foreground }]}>{record.studentName}</Text>
        <Text style={[cardStyles.date, { color: colors.mutedForeground }]}>{record.date}</Text>
        {record.notes && <Text style={[cardStyles.notes, { color: colors.mutedForeground }]}>{record.notes}</Text>}
      </View>
      <View style={[cardStyles.statusBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[cardStyles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  info: { flex: 1 },
  studentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  notes: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});

export default function AttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === "admin" || user?.role === "teacher";
  const [filter, setFilter] = useState<"all" | "present" | "absent" | "late">("all");

  const { data: attendance, isLoading, refetch, isRefetching } = useGetAttendance();

  const filtered = (attendance ?? []).filter((r) => filter === "all" || r.status === filter);
  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const filters: Array<{ key: typeof filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "present", label: "Present" },
    { key: "absent", label: "Absent" },
    { key: "late", label: "Late" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
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
          renderItem={({ item }) => <AttendanceCard record={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Feather name="check-circle" size={40} color={colors.mutedForeground} />
              <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 12 }}>
                No attendance records found
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
