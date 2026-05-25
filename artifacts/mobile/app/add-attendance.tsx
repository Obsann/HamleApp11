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
      onError: () => {
        Alert.alert("Error", "Failed to record attendance.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const handleSubmit = () => {
    if (!studentId || !date) {
      Alert.alert("Missing Fields", "Please select a student and date.");
      return;
    }
    recordAttendance({
      data: {
        studentId,
        date,
        status,
        notes: notes.trim() || null,
      },
    });
  };

  const statuses: Array<{ key: typeof status; label: string; icon: string; color: string; bg: string }> = [
    { key: "present", label: "Present", icon: "check-circle", color: "#16A34A", bg: "#DCFCE7" },
    { key: "absent", label: "Absent", icon: "x-circle", color: "#DC2626", bg: "#FEE2E2" },
    { key: "late", label: "Late", icon: "clock", color: "#D97706", bg: "#FEF3C7" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Student</Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
        {!students?.length ? (
          <Text style={{ padding: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>No students available</Text>
        ) : (
          students.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
              onPress={() => setStudentId(s.id)}
            >
              <Text style={{ fontFamily: "Inter_500Medium", color: colors.foreground, fontSize: 15 }}>{s.firstName} {s.lastName}</Text>
              {studentId === s.id && <Feather name="check-circle" size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Status</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {statuses.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", gap: 6, backgroundColor: status === s.key ? s.bg : colors.secondary, borderWidth: 2, borderColor: status === s.key ? s.color : "transparent" }}
            onPress={() => setStatus(s.key)}
          >
            <Feather name={s.icon as any} size={20} color={status === s.key ? s.color : colors.mutedForeground} />
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: status === s.key ? s.color : colors.mutedForeground }}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Date (YYYY-MM-DD)</Text>
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
