import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  useGetStudent,
  useGetStudentReports,
  useGetStudentAttendance,
  useDeleteStudent,
  getGetStudentsQueryKey,
} from "@workspace/api-client-react";
import ConfirmDialog from "../../components/ConfirmDialog";

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  grade: { bg: "#E8EEF8", text: "#1B3D7A", label: "Grade" },
  assessment: { bg: "#FEF3C7", text: "#D97706", label: "Assessment" },
  attendance: { bg: "#DCFCE7", text: "#16A34A", label: "Attendance" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  present: { color: "#16A34A", bg: "#DCFCE7" },
  absent: { color: "#DC2626", bg: "#FEE2E2" },
  late: { color: "#D97706", bg: "#FEF3C7" },
};

type ContactInfo = { name: string; email: string | null; role: "teacher" | "parent" } | null;

export default function StudentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [contactModal, setContactModal] = useState<ContactInfo>(null);

  const { data: student, isLoading: loadingStudent } = useGetStudent(id!, { query: { enabled: !!id } as any });
  const { data: reports, isLoading: loadingReports } = useGetStudentReports(id!, { query: { enabled: !!id } as any });
  const { data: attendance, isLoading: loadingAttendance } = useGetStudentAttendance(id!, { query: { enabled: !!id } as any });
  const { mutate: deleteStudent, isPending: deleting } = useDeleteStudent();

  const isTeacherOrAdmin = user?.role === "admin" || user?.role === "teacher";

  const showEdit = user?.role === "admin" || (user?.role === "teacher" && (student as any)?.teacherId === user.id);
  const showDelete = user?.role === "admin";

  const initials = student ? `${student.firstName[0]}${student.lastName[0]}`.toUpperCase() : "?";
  const presentCount = attendance?.filter((a) => a.status === "present").length ?? 0;
  const totalAtt = attendance?.length ?? 0;
  const attRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;
  const avgScore = reports && reports.length > 0
    ? Math.round((reports.filter((r) => r.score != null).reduce((acc, r) => acc + (r.score ?? 0), 0) / reports.filter((r) => r.score != null).length) * 10) / 10
    : null;

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const handleDelete = () => {
    setConfirmDeleteVisible(false);
    deleteStudent(
      { id: id! },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/(tabs)/students");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to delete student.";
          Alert.alert("Error", msg);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const handleContactPress = (type: "teacher" | "parent") => {
    const name = type === "teacher" ? (student as any)?.teacherName : (student as any)?.parentName;
    const email = type === "teacher" ? (student as any)?.teacherEmail : (student as any)?.parentEmail;
    const linkedId = type === "teacher" ? (student as any)?.teacherId : (student as any)?.parentId;

    if (!name && !linkedId) return;

    if (user?.role === "admin" && linkedId) {
      // Admin: navigate to edit user directly
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/edit-user?id=${linkedId}` as any);
    } else {
      // Teacher/Parent: show contact card
      if (!name) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setContactModal({ name, email: email ?? null, role: type });
    }
  };

  if (loadingStudent || deleting) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Feather name="user-x" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: "Inter_500Medium", marginTop: 12 }}>Student not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const studentAny = student as any;

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
        {/* Header Banner */}
        <View style={{ backgroundColor: colors.primary, paddingTop: top + 16, paddingBottom: 40, paddingHorizontal: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" }}>{student.firstName} {student.lastName}</Text>
          <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{student.grade}</Text>
          {student.studentNo && (
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              ID: {student.studentNo}
            </Text>
          )}

          {/* Teacher row — clickable */}
          {(studentAny.teacherName || studentAny.teacherId) && (
            <TouchableOpacity
              onPress={() => handleContactPress("teacher")}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start" }}
            >
              <Feather name="user" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.9)" }}>
                Teacher: {studentAny.teacherName ?? "—"}
              </Text>
              <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
                  {user?.role === "admin" ? "EDIT" : "CONTACT"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Parent row — clickable */}
          {(studentAny.parentName || studentAny.parentId) && (
            <TouchableOpacity
              onPress={() => handleContactPress("parent")}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, alignSelf: "flex-start" }}
            >
              <Feather name="home" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.9)" }}>
                Parent: {studentAny.parentName ?? "—"}
              </Text>
              <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
                  {user?.role === "admin" ? "EDIT" : "CONTACT"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Action Buttons Row */}
          {(showEdit || showDelete) && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              {showEdit && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/edit-student?id=${student.id}`);
                  }}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                  }}
                >
                  <Feather name="edit-2" size={14} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Edit Student</Text>
                </TouchableOpacity>
              )}
              {showDelete && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setConfirmDeleteVisible(true);
                  }}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    backgroundColor: "rgba(239, 68, 68, 0.4)",
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                  }}
                >
                  <Feather name="trash-2" size={14} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={{ marginTop: -20, marginHorizontal: 20, flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.primary }}>{avgScore ?? "—"}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 4 }}>Avg Score</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#16A34A" }}>{attRate}%</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 4 }}>Attendance</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.accent }}>{reports?.length ?? 0}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 4 }}>Reports</Text>
          </View>
        </View>

        {/* Additional Info */}
        {(student.address || student.medicalInfo || student.emergencyContact) ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 12 }}>Additional Info</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16 }}>
              {student.address && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Address</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, marginTop: 2 }}>
                    {typeof student.address === "object"
                      ? `${student.address.region || ""}${student.address.zone ? `, ${student.address.zone}` : ""}${student.address.kebele ? `, Kebele ${student.address.kebele}` : ""}${student.address.houseNo ? `, House ${student.address.houseNo}` : ""}`
                      : student.address}
                  </Text>
                </View>
              )}
              {student.emergencyContact && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Emergency Contact</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, marginTop: 2 }}>{student.emergencyContact}</Text>
                </View>
              )}
              {student.medicalInfo && (
                <View>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Medical Information</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, marginTop: 2 }}>{student.medicalInfo}</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Recent Reports */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>Recent Reports</Text>
            {isTeacherOrAdmin && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/add-report"); }}
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" }}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {loadingReports ? (
            <ActivityIndicator color={colors.primary} />
          ) : !reports?.length ? (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>No reports yet</Text>
          ) : (
            reports.slice(0, 5).map((r) => {
              const typeInfo = TYPE_COLORS[r.type] ?? TYPE_COLORS["grade"]!;
              return (
                <View key={r.id} style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{r.subject}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>{r.date}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    {r.score != null && (
                      <View style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>{r.score}</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: typeInfo.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: typeInfo.text, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{typeInfo.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Attendance */}
        <View style={{ paddingHorizontal: 20, marginBottom: insets.bottom + 40 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>Attendance</Text>
            {isTeacherOrAdmin && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/add-attendance"); }}
                style={{ backgroundColor: "#16A34A", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" }}>+ Record</Text>
              </TouchableOpacity>
            )}
          </View>
          {loadingAttendance ? (
            <ActivityIndicator color={colors.primary} />
          ) : !attendance?.length ? (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>No attendance records</Text>
          ) : (
            attendance.slice(0, 7).map((a) => {
              const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG["present"]!;
              return (
                <View key={a.id} style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground }}>{a.date}</Text>
                  <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ color: cfg.color, fontFamily: "Inter_700Bold", fontSize: 13, textTransform: "capitalize" }}>{a.status}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Delete Confirm */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete Student?"
        message={`Are you sure you want to permanently delete ${student.firstName} ${student.lastName}? This will also delete all of their grades, assessment reports, and attendance records.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />

      {/* Contact Modal */}
      <Modal
        visible={contactModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setContactModal(null)}
      >
        <View style={contactStyles.overlay}>
          <View style={[contactStyles.sheet, { backgroundColor: colors.background }]}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 }} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}>
                <Feather
                  name={contactModal?.role === "teacher" ? "user" : "home"}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {contactModal?.role === "teacher" ? "Class Teacher" : "Parent / Guardian"}
                </Text>
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 2 }}>
                  {contactModal?.name}
                </Text>
                {contactModal?.email && (
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                    {contactModal.email}
                  </Text>
                )}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {contactModal?.email && (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 15 }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openURL(`mailto:${contactModal.email}`);
                  }}
                >
                  <Feather name="mail" size={20} color="#fff" />
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Send Email</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.secondary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 15 }}
                onPress={() => setContactModal(null)}
              >
                <Feather name="x" size={20} color={colors.foreground} />
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const contactStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
