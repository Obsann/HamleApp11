import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useGetStudents, useCreateAttendance, getGetAttendanceQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";

const STATUSES = [
  { key: "present" as const, label: "Present", icon: "check-circle" as const, color: "#16A34A", bg: "#DCFCE7" },
  { key: "absent" as const, label: "Absent", icon: "x-circle" as const, color: "#DC2626", bg: "#FEE2E2" },
  { key: "late" as const, label: "Late", icon: "clock" as const, color: "#D97706", bg: "#FEF3C7" },
];

export default function AddAttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"present" | "absent" | "late">("present");
  const [notes, setNotes] = useState("");

  const { data: students } = useGetStudents();
  const { mutate: recordAttendance, isPending } = useCreateAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? err?.message ?? "Failed to record attendance. Please try again.";
        Alert.alert("Error", msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const handleSubmit = () => {
    if (!studentId) {
      Alert.alert("Missing Fields", "Please select a student.");
      return;
    }
    if (!date.trim()) {
      Alert.alert("Missing Fields", "Please enter a date.");
      return;
    }
    // Validate date is a real calendar date
    const isValidDate = (dateStr: string): boolean => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y!, m! - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
    };
    if (!isValidDate(date.trim())) {
      Alert.alert("Invalid Date", "Date must be a valid date in YYYY-MM-DD format.");
      return;
    }
    // Prevent future dates
    if (new Date(date.trim()) > new Date()) {
      Alert.alert("Invalid Date", "Attendance date cannot be in the future.");
      return;
    }
    recordAttendance({
      data: { studentId, date: date.trim(), status, notes: notes.trim() || null },
    });
  };

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top + 8, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground }}>Record Attendance</Text>
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Select Student *</Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: "hidden" }}>
        {!students?.length ? (
          <Text style={{ padding: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>No students available</Text>
        ) : (
          students.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              style={{
                flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                padding: 14,
                borderBottomWidth: i < students.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: studentId === s.id ? colors.primary + "12" : "transparent",
              }}
              onPress={() => setStudentId(s.id)}
            >
              <View>
                <Text style={{ fontFamily: "Inter_500Medium", color: colors.foreground, fontSize: 15 }}>
                  {s.firstName} {s.lastName}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  {s.grade}
                </Text>
              </View>
              {studentId === s.id && <Feather name="check-circle" size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Status *</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={{
              flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", gap: 6,
              backgroundColor: status === s.key ? s.bg : colors.secondary,
              borderWidth: 2, borderColor: status === s.key ? s.color : "transparent",
            }}
            onPress={() => setStatus(s.key)}
          >
            <Feather name={s.icon} size={20} color={status === s.key ? s.color : colors.mutedForeground} />
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: status === s.key ? s.color : colors.mutedForeground }}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Date * (YYYY-MM-DD)</Text>
      <TextInput
        style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
        value={date}
        onChangeText={setDate}
        placeholder="2025-01-01"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Notes (optional)</Text>
      <TextInput
        style={{ height: 90, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingTop: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 24, textAlignVertical: "top" }}
        value={notes}
        onChangeText={setNotes}
        placeholder="Reason for absence or late arrival..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={{ height: 54, backgroundColor: "#16A34A", borderRadius: 14, alignItems: "center", justifyContent: "center", opacity: isPending ? 0.6 : 1 }}
        onPress={handleSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" }}>Record Attendance</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
