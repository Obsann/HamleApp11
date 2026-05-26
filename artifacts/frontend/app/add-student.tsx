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
import { useAuth } from "@/context/AuthContext";
import { getGetStudentsQueryKey } from "@workspace/api-client-react";
import { API_URL } from "@/constants/api";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8",
];

export default function AddStudentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [faydaId, setFaydaId] = useState("");
  const [region, setRegion] = useState("Addis Ababa");
  const [zone, setZone] = useState("");
  const [kebele, setKebele] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [isPending, setIsPending] = useState(false);

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

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

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !grade || !dateOfBirth.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
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
      Alert.alert("Invalid Date", "Date of Birth must be a valid date in YYYY-MM-DD format.");
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

    try {
      setIsPending(true);
      const res = await fetch(`${API_URL}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          grade,
          dateOfBirth: dateOfBirth.trim(),
          faydaId: faydaId.trim() || null,
          address: {
            region: region.trim(),
            zone: zone.trim(),
            kebele: kebele.trim(),
            houseNo: houseNo.trim(),
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Failed to add student");
      }
      await queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to add student. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPending(false);
    }
  };

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
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground }}>Add Student</Text>
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>First Name *</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 16,
        }}
        value={firstName}
        onChangeText={handleFirstNameChange}
        placeholder="e.g. Abebe"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
        maxLength={50}
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Last Name *</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 16,
        }}
        value={lastName}
        onChangeText={handleLastNameChange}
        placeholder="e.g. Kebede"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
        maxLength={50}
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Grade *</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {GRADES.map((g) => (
          <TouchableOpacity
            key={g}
            style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
              backgroundColor: grade === g ? colors.primary : colors.card,
              borderWidth: 1.5,
              borderColor: grade === g ? colors.primary : colors.border,
            }}
            onPress={() => setGrade(g)}
          >
            <Text style={{
              fontSize: 13, fontFamily: "Inter_600SemiBold",
              color: grade === g ? "#fff" : colors.foreground,
            }}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Date of Birth * (YYYY-MM-DD)</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 16,
        }}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="2015-03-25"
        placeholderTextColor={colors.mutedForeground}
        maxLength={10}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Ethiopian Fayda ID (12 Digits)</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 16,
        }}
        value={faydaId}
        onChangeText={handleFaydaIdChange}
        placeholder="12-digit National ID"
        keyboardType="number-pad"
        maxLength={12}
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 8, marginBottom: 12 }}>Address Details</Text>

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Region</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 16,
        }}
        value={region}
        onChangeText={setRegion}
        placeholder="e.g. Addis Ababa"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Zone / Sub-City</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 16,
        }}
        value={zone}
        onChangeText={setZone}
        placeholder="e.g. Bole"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>Kebele</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 16,
        }}
        value={kebele}
        onChangeText={setKebele}
        placeholder="e.g. 03"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>House Number</Text>
      <TextInput
        style={{
          height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
          paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular",
          color: colors.foreground, backgroundColor: colors.card, marginBottom: 28,
        }}
        value={houseNo}
        onChangeText={setHouseNo}
        placeholder="e.g. 1024"
        placeholderTextColor={colors.mutedForeground}
      />

      <TouchableOpacity
        style={{
          height: 54, backgroundColor: colors.primary, borderRadius: 14,
          alignItems: "center", justifyContent: "center", opacity: isPending ? 0.6 : 1,
        }}
        onPress={handleSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" }}>Save Student</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
