import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  useGetStudent,
  useUpdateStudent,
  useGetUsers,
  getGetStudentsQueryKey,
  getGetStudentQueryKey,
} from "@workspace/api-client-react";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8",
];

const ENROLLMENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "transferred", label: "Transferred" },
  { value: "graduated", label: "Graduated" },
];

export default function EditStudentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isAdmin = user?.role === "admin";

  // Fetch Student data
  const { data: student, isLoading: loadingStudent } = useGetStudent(id!, {
    query: { enabled: !!id } as any,
  });

  // Fetch Parents and Teachers for Admin selection
  const { data: parents, isLoading: loadingParents } = useGetUsers(
    { role: "parent" },
    { query: { enabled: isAdmin } as any }
  );
  const { data: teachers, isLoading: loadingTeachers } = useGetUsers(
    { role: "teacher" },
    { query: { enabled: isAdmin } as any }
  );

  const { mutate: updateStudent, isPending } = useUpdateStudent();

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [region, setRegion] = useState("Addis Ababa");
  const [zone, setZone] = useState("");
  const [kebele, setKebele] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [faydaId, setFaydaId] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState<
    "active" | "inactive" | "withdrawn" | "transferred" | "graduated"
  >("active");
  const [medicalInfo, setMedicalInfo] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Selector Modal State
  const [pickerType, setPickerType] = useState<"parent" | "teacher" | "status" | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  useEffect(() => {
    if (student) {
      setFirstName(student.firstName);
      setLastName(student.lastName);
      setGrade(student.grade);
      setDateOfBirth(student.dateOfBirth);
      setGender((student.gender as "male" | "female") || "male");
      if (student.address && typeof student.address === "object") {
        setRegion(student.address.region || "");
        setZone(student.address.zone || "");
        setKebele(student.address.kebele || "");
        setHouseNo(student.address.houseNo || "");
      }
      setFaydaId(student.faydaId || "");
      setEnrollmentStatus(
        (student.enrollmentStatus as
          | "active"
          | "inactive"
          | "withdrawn"
          | "transferred"
          | "graduated") || "active"
      );
      setMedicalInfo(student.medicalInfo || "");
      // Parse existing emergency contact "Name - Phone" format
      const ec = student.emergencyContact || "";
      const dashIdx = ec.indexOf(" - ");
      if (dashIdx > -1) {
        setEmergencyContactName(ec.substring(0, dashIdx));
        setEmergencyContactPhone(ec.substring(dashIdx + 3));
      } else {
        setEmergencyContactName(ec);
        setEmergencyContactPhone("");
      }
      setParentId(student.parentId || null);
      setTeacherId(student.teacherId || null);
    }
  }, [student]);

  const top = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top + 8;

  // --- Validation helpers ---
  const NAME_REGEX = /^[a-zA-Z\u1200-\u137F\s]+$/; // Latin + Amharic letters only
  const stripNonAlpha = (text: string) => text.replace(/[^a-zA-Z\u1200-\u137F\s]/g, "");
  const stripNonDigit = (text: string) => text.replace(/[^0-9]/g, "");

  const isValidDate = (dateStr: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y!, m! - 1, d);
    return date.getFullYear() === y && date.getMonth() === m! - 1 && date.getDate() === d;
  };

  const handleFirstNameChange = (text: string) => setFirstName(stripNonAlpha(text));
  const handleLastNameChange = (text: string) => setLastName(stripNonAlpha(text));
  const handleFaydaIdChange = (text: string) => setFaydaId(stripNonDigit(text));
  const handleEmergencyNameChange = (text: string) => setEmergencyContactName(stripNonAlpha(text));
  const handlePhoneChange = (text: string) => setEmergencyContactPhone(text.replace(/[^0-9+]/g, ""));

  // Ethiopian phone number regex: +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, 07XXXXXXXX
  const PHONE_REGEX = /^(\+251[97]\d{8}|0[97]\d{8})$/;

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim() || !grade || !dateOfBirth.trim()) {
      Alert.alert("Missing Fields", "First name, last name, grade, and date of birth are required.");
      return;
    }
    if (!NAME_REGEX.test(firstName.trim())) {
      Alert.alert("Invalid Name", "First name must contain only letters (no numbers or special characters).");
      return;
    }
    if (!NAME_REGEX.test(lastName.trim())) {
      Alert.alert("Invalid Name", "Last name must contain only letters (no numbers or special characters).");
      return;
    }
    if (!isValidDate(dateOfBirth.trim())) {
      Alert.alert("Invalid Date", "Date of birth must be a valid date in YYYY-MM-DD format.");
      return;
    }
    // Ensure the child is between 3 and 18 years old
    const dob = new Date(dateOfBirth.trim());
    const today = new Date();
    const ageDiffMs = today.getTime() - dob.getTime();
    const ageYears = ageDiffMs / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 3 || ageYears > 18) {
      Alert.alert("Invalid Age", "Student must be between 3 and 18 years old.");
      return;
    }
    if (faydaId.trim() && (faydaId.trim().length !== 12 || !/^\d{12}$/.test(faydaId.trim()))) {
      Alert.alert("Invalid Fayda ID", "Fayda ID must be exactly 12 digits (numbers only).");
      return;
    }
    // Validate emergency contact phone if provided
    if (emergencyContactPhone.trim() && !PHONE_REGEX.test(emergencyContactPhone.trim())) {
      Alert.alert("Invalid Phone Number", "Phone must be in format: +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const updatePayload: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      grade,
      dateOfBirth: dateOfBirth.trim(),
      gender,
      address: {
        region: region.trim(),
        zone: zone.trim(),
        kebele: kebele.trim(),
        houseNo: houseNo.trim(),
      },
      faydaId: faydaId.trim() || null,
      enrollmentStatus,
      medicalInfo: medicalInfo.trim() || null,
      emergencyContact: emergencyContactName.trim() && emergencyContactPhone.trim()
        ? `${emergencyContactName.trim()} - ${emergencyContactPhone.trim()}`
        : emergencyContactName.trim() || emergencyContactPhone.trim() || null,
    };

    if (isAdmin) {
      updatePayload.parentId = parentId;
      updatePayload.teacherId = teacherId;
    }

    updateStudent(
      {
        id: id!,
        data: updatePayload,
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
          await queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id!) });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to update student profile.";
          Alert.alert("Error", msg);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const getPickerData = () => {
    if (pickerType === "status") {
      return ENROLLMENT_STATUSES;
    }
    const list = pickerType === "parent" ? parents : teachers;
    if (!list) return [];
    
    const filtered = list.filter((u: any) =>
      u.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(pickerSearch.toLowerCase())
    );
    return [{ id: "none", name: "None (Unassign)" }, ...filtered];
  };

  const getSelectedLabel = (type: "parent" | "teacher" | "status") => {
    if (type === "status") {
      return ENROLLMENT_STATUSES.find((s) => s.value === enrollmentStatus)?.label ?? "";
    }
    if (type === "parent") {
      if (!parentId) return "Unassigned";
      return parents?.find((p: any) => p.id === parentId)?.name ?? student?.parentName ?? "Unassigned";
    }
    if (type === "teacher") {
      if (!teacherId) return "Unassigned";
      return teachers?.find((t: any) => t.id === teacherId)?.name ?? student?.teacherName ?? "Unassigned";
    }
    return "";
  };

  if (loadingStudent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground }}>Edit Student</Text>
        </View>

        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={firstName}
          onChangeText={handleFirstNameChange}
          placeholder="First name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          maxLength={50}
        />

        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={lastName}
          onChangeText={handleLastNameChange}
          placeholder="Last name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          maxLength={50}
        />

        <Text style={styles.label}>Student ID / Number (Read Only)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.mutedForeground }]}
          value={student?.studentNo}
          editable={false}
        />

        <Text style={styles.label}>Date of Birth * (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Gender</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          {(["male", "female"] as const).map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGender(g)}
              style={[
                styles.genderButton,
                {
                  borderColor: gender === g ? colors.primary : colors.border,
                  backgroundColor: gender === g ? colors.primary + "15" : colors.card,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: gender === g ? colors.primary : colors.mutedForeground,
                  textTransform: "capitalize",
                }}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Grade *</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {GRADES.map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.gradeBadge,
                {
                  backgroundColor: grade === g ? colors.primary : colors.card,
                  borderColor: grade === g ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setGrade(g)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: grade === g ? "#fff" : colors.foreground,
                }}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Enrollment Status</Text>
        <TouchableOpacity
          style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setPickerType("status")}
        >
          <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground }}>
            {getSelectedLabel("status")}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Roles & Dropdowns section */}
        {isAdmin ? (
          <>
            <Text style={styles.label}>Parent / Guardian (Admin Only)</Text>
            <TouchableOpacity
              style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setPickerType("parent")}
            >
              <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground }}>
                {getSelectedLabel("parent")}
              </Text>
              <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <Text style={styles.label}>Assigned Teacher (Admin Only)</Text>
            <TouchableOpacity
              style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setPickerType("teacher")}
            >
              <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground }}>
                {getSelectedLabel("teacher")}
              </Text>
              <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Parent / Guardian (Read Only for Teachers)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.mutedForeground }]}
              value={student?.parentName ?? "Unassigned"}
              editable={false}
            />

            <Text style={styles.label}>Assigned Teacher (Read Only for Teachers)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.mutedForeground }]}
              value={student?.teacherName ?? "Unassigned"}
              editable={false}
            />
          </>
        )}

        <Text style={styles.label}>Ethiopian Fayda ID (12 Digits)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={faydaId}
          onChangeText={handleFaydaIdChange}
          placeholder="12-digit National ID"
          keyboardType="number-pad"
          maxLength={12}
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 8, marginBottom: 12 }}>Address Details</Text>

        <Text style={styles.label}>Region</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={region}
          onChangeText={setRegion}
          placeholder="e.g. Addis Ababa"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Zone / Sub-City</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={zone}
          onChangeText={setZone}
          placeholder="e.g. Bole"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Kebele</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={kebele}
          onChangeText={setKebele}
          placeholder="e.g. 03"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>House Number</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={houseNo}
          onChangeText={setHouseNo}
          placeholder="e.g. 1024"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Medical Info / Notes</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              color: colors.foreground,
              height: 100,
              textAlignVertical: "top",
              paddingTop: 12,
            },
          ]}
          value={medicalInfo}
          onChangeText={setMedicalInfo}
          placeholder="Allergies, chronic conditions, etc."
          placeholderTextColor={colors.mutedForeground}
          multiline
        />

        <Text style={styles.label}>Emergency Contact Name</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={emergencyContactName}
          onChangeText={handleEmergencyNameChange}
          placeholder="e.g. Almaz Kebede"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          maxLength={80}
        />

        <Text style={styles.label}>Emergency Contact Phone *</Text>
        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular" as const, color: colors.mutedForeground, marginBottom: 6 }}>Format: +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={emergencyContactPhone}
          onChangeText={handlePhoneChange}
          placeholder="e.g. +251912345678 or 0912345678"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          maxLength={13}
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isPending ? colors.mutedForeground : colors.primary },
          ]}
          onPress={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" }}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Picker Modal for Parents / Teachers / Enrollment Status */}
      <Modal
        visible={pickerType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {pickerType === "status"
                  ? "Select Status"
                  : pickerType === "parent"
                  ? "Select Parent"
                  : "Select Teacher"}
              </Text>
              <TouchableOpacity onPress={() => { setPickerType(null); setPickerSearch(""); }}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {pickerType !== "status" && (
              <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 15 }}
                  placeholder="Search user..."
                  placeholderTextColor={colors.mutedForeground}
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>
            )}

            <FlatList
              data={getPickerData() as any}
              keyExtractor={(item) => (item as any).id || (item as any).value}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
              renderItem={({ item }) => {
                const isSelected =
                  pickerType === "status"
                    ? (item as any).value === enrollmentStatus
                    : pickerType === "parent"
                    ? (item as any).id === parentId || ((item as any).id === "none" && !parentId)
                    : (item as any).id === teacherId || ((item as any).id === "none" && !teacherId);

                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isSelected ? colors.primary + "10" : "transparent",
                      },
                    ]}
                    onPress={() => {
                      if (pickerType === "status") {
                        setEnrollmentStatus((item as any).value);
                      } else if (pickerType === "parent") {
                        setParentId((item as any).id === "none" ? null : (item as any).id);
                      } else if (pickerType === "teacher") {
                        setTeacherId((item as any).id === "none" ? null : (item as any).id);
                      }
                      setPickerType(null);
                      setPickerSearch("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                          color: isSelected ? colors.primary : colors.foreground,
                        }}
                      >
                        {(item as any).name || (item as any).label}
                      </Text>
                      {(item as any).email && (item as any).id !== "none" && (
                        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                          {(item as any).email}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Feather name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7A99",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  selector: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  submitBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  pickerItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
});
