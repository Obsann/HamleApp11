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
import { useGetStudents, useCreateReport, getGetReportsQueryKey } from "@workspace/api-client-react";

const TYPES: Array<{ key: "grade" | "assessment"; label: string; color: string }> = [
  { key: "grade", label: "Grade", color: "#1B3D7A" },
  { key: "assessment", label: "Assessment", color: "#D97706" },
];

export default function AddReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState("");
  const [midExam, setMidExam] = useState("");
  const [tests, setTests] = useState("");
  const [continuousAssessment, setContinuousAssessment] = useState("");
  const [finalExam, setFinalExam] = useState("");
  const [type, setType] = useState<"grade" | "assessment">("grade");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [term, setTerm] = useState("Term 1");

  const { data: students } = useGetStudents();
  const { mutate: createReport, isPending } = useCreateReport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? err?.message ?? "Failed to create report. Please try again.";
        Alert.alert("Error", msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  // --- Validation helpers ---
  const SUBJECT_REGEX = /^[a-zA-Z\u1200-\u137F\s]+$/;

  const isValidDate = (dateStr: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y!, m! - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
  };

  const handleSubjectChange = (text: string) => setSubject(text.replace(/[0-9]/g, ""));

  const handleSubmit = () => {
    if (!studentId) {
      Alert.alert("Missing Fields", "Please select a student.");
      return;
    }
    if (!subject.trim()) {
      Alert.alert("Missing Fields", "Please enter a subject.");
      return;
    }
    if (!SUBJECT_REGEX.test(subject.trim())) {
      Alert.alert("Invalid Subject", "Subject name must contain only letters (no numbers).");
      return;
    }
    if (!date) {
      Alert.alert("Missing Fields", "Please set the date.");
      return;
    }
    if (!isValidDate(date.trim())) {
      Alert.alert("Invalid Date", "Date must be a valid date in YYYY-MM-DD format.");
      return;
    }
    const scoreNum = score.trim() ? Number(score.trim()) : undefined;
    if (scoreNum !== undefined && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100)) {
      Alert.alert("Invalid Score", "Score must be a number between 0 and 100.");
      return;
    }

    const midVal = midExam.trim() ? Number(midExam.trim()) : 0;
    const testVal = tests.trim() ? Number(tests.trim()) : 0;
    const caVal = continuousAssessment.trim() ? Number(continuousAssessment.trim()) : 0;
    const finalVal = finalExam.trim() ? Number(finalExam.trim()) : 0;

    if (type === "grade") {
      if (isNaN(midVal) || midVal < 0 || midVal > 100) {
        Alert.alert("Invalid Score", "Mid Exam must be a number between 0 and 100.");
        return;
      }
      if (isNaN(testVal) || testVal < 0 || testVal > 100) {
        Alert.alert("Invalid Score", "Tests must be a number between 0 and 100.");
        return;
      }
      if (isNaN(caVal) || caVal < 0 || caVal > 100) {
        Alert.alert("Invalid Score", "Continuous Assessment must be a number between 0 and 100.");
        return;
      }
      if (isNaN(finalVal) || finalVal < 0 || finalVal > 100) {
        Alert.alert("Invalid Score", "Final Exam must be a number between 0 and 100.");
        return;
      }
      // Total of all sub-scores must not exceed 100
      const total = midVal + testVal + caVal + finalVal;
      if (total > 100) {
        Alert.alert("Invalid Total", `The total of all sub-scores (${total}) exceeds 100. Please adjust the scores.`);
        return;
      }
    }

    createReport({
      data: {
        studentId,
        subject: subject.trim(),
        score: type === "grade" ? (midVal + testVal + caVal + finalVal) : (scoreNum ?? null),
        midExam: type === "grade" ? midVal : null,
        tests: type === "grade" ? testVal : null,
        continuousAssessment: type === "grade" ? caVal : null,
        finalExam: type === "grade" ? finalVal : null,
        type,
        date,
        notes: notes.trim() || null,
        term: term.trim() || null,
      },
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
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground }}>Add Report</Text>
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

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Report Type *</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
              backgroundColor: type === t.key ? t.color : colors.secondary,
            }}
            onPress={() => setType(t.key)}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: type === t.key ? "#fff" : colors.foreground }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Subject *</Text>
      <TextInput
        style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
        value={subject}
        onChangeText={handleSubjectChange}
        placeholder="e.g. Mathematics, Amharic, Science"
        placeholderTextColor={colors.mutedForeground}
        maxLength={60}
      />

      {type === "grade" ? (
        <>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Mid Exam Score</Text>
          <TextInput
            style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
            value={midExam}
            onChangeText={setMidExam}
            placeholder="e.g. 15"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={3}
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Tests Score</Text>
          <TextInput
            style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
            value={tests}
            onChangeText={setTests}
            placeholder="e.g. 8"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={3}
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Continuous Assessment Score</Text>
          <TextInput
            style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
            value={continuousAssessment}
            onChangeText={setContinuousAssessment}
            placeholder="e.g. 18"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={3}
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Final Exam Score</Text>
          <TextInput
            style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
            value={finalExam}
            onChangeText={setFinalExam}
            placeholder="e.g. 45"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={3}
          />

          {/* Real-time sum calculation */}
          {(() => {
            const sum = (Number(midExam) || 0) + (Number(tests) || 0) + (Number(continuousAssessment) || 0) + (Number(finalExam) || 0);
            const isPass = sum >= 50;
            return (
              <View style={{ backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Calculated Total Score</Text>
                  <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 4 }}>{sum} / 100</Text>
                </View>
                <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: isPass ? "#D1FAE5" : "#FEE2E2" }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: isPass ? "#065F46" : "#991B1B" }}>{isPass ? "PASS" : "FAIL"}</Text>
                </View>
              </View>
            );
          })()}
        </>
      ) : (
        <>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Score (0–100, optional)</Text>
          <TextInput
            style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
            value={score}
            onChangeText={setScore}
            placeholder="e.g. 85"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
          />
        </>
      )}

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Date (YYYY-MM-DD) *</Text>
      <TextInput
        style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
        value={date}
        onChangeText={setDate}
        placeholder="2025-01-01"
        placeholderTextColor={colors.mutedForeground}
        maxLength={10}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Term</Text>
      <TextInput
        style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 16 }}
        value={term}
        onChangeText={setTerm}
        placeholder="Term 1"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Notes (optional)</Text>
      <TextInput
        style={{ height: 90, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingTop: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, backgroundColor: colors.card, marginBottom: 24, textAlignVertical: "top" }}
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional notes..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={{ height: 54, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", opacity: isPending ? 0.6 : 1 }}
        onPress={handleSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" }}>Save Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
