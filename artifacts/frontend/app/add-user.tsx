import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useCreateUser, getGetUsersQueryKey } from "@workspace/api-client-react";

type Role = "teacher" | "parent";

export default function AddUserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("teacher");

  const { mutate: createUser, isPending } = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Failed to create user. Please try again.";
        Alert.alert("Error", msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  // --- Validation helpers ---
  const NAME_REGEX = /^[a-zA-Z\u1200-\u137F\s]+$/;
  const stripNonAlpha = (text: string) => text.replace(/[^a-zA-Z\u1200-\u137F\s]/g, "");
  const handleNameChange = (text: string) => setName(stripNonAlpha(text));

  function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("Missing fields", "Please enter the user's full name.");
      return;
    }
    if (!NAME_REGEX.test(name.trim())) {
      Alert.alert("Invalid Name", "Name must contain only letters (no numbers or special characters).");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Missing fields", "Please enter an email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Missing fields", "Please enter a password.");
      return;
    }
    // Match backend password complexity requirements
    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (!/[a-z]/.test(password)) {
      Alert.alert("Weak Password", "Password must contain at least one lowercase letter.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      Alert.alert("Weak Password", "Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert("Weak Password", "Password must contain at least one number.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      Alert.alert("Weak Password", 'Password must contain at least one special character (!@#$%^&* etc.).');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createUser({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      },
    });
  }

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const ROLES: Array<{ key: Role; label: string; icon: string; desc: string }> = [
    { key: "teacher", label: "Teacher", icon: "book-open", desc: "Can manage students & grades" },
    { key: "parent", label: "Parent", icon: "home", desc: "Can view their child's progress" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: top + 8,
        paddingBottom: insets.bottom + 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground }}>
          Add New User
        </Text>
      </View>

      <Text style={[labelStyle, { color: colors.foreground }]}>Full Name *</Text>
      <TextInput
        style={[inputStyle, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
        value={name}
        onChangeText={handleNameChange}
        placeholder="e.g. Tigist Alemu"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
        maxLength={80}
      />

      <Text style={[labelStyle, { color: colors.foreground }]}>Email Address *</Text>
      <TextInput
        style={[inputStyle, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
        value={email}
        onChangeText={setEmail}
        placeholder="e.g. tigist@hamle.edu"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={[labelStyle, { color: colors.foreground }]}>Password *</Text>
      <View style={{ position: "relative", marginBottom: 18 }}>
        <TextInput
          style={[inputStyle, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, marginBottom: 0, paddingRight: 50 }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Min 8 chars, uppercase, lowercase, digit, special"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((p) => !p)}
          style={{ position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" }}
        >
          <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[labelStyle, { color: colors.foreground }]}>Role *</Text>
      <View style={{ gap: 10, marginBottom: 32 }}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.key}
            onPress={() => setRole(r.key)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 14,
              borderWidth: 2,
              borderColor: role === r.key ? colors.primary : colors.border,
              backgroundColor: role === r.key ? colors.primary + "12" : colors.card,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: role === r.key ? colors.primary : colors.secondary,
              alignItems: "center", justifyContent: "center",
            }}>
              <Feather name={r.icon as any} size={18} color={role === r.key ? "#fff" : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: role === r.key ? colors.primary : colors.foreground }}>
                {r.label}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                {r.desc}
              </Text>
            </View>
            {role === r.key && <Feather name="check-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={{
          height: 54, backgroundColor: isPending ? colors.mutedForeground : colors.primary,
          borderRadius: 14, alignItems: "center", justifyContent: "center",
        }}
        onPress={handleSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" }}>
            Create User
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const labelStyle = {
  fontSize: 14,
  fontFamily: "Inter_600SemiBold" as const,
  marginBottom: 6,
};

const inputStyle = {
  borderRadius: 12,
  borderWidth: 1.5,
  paddingHorizontal: 16,
  paddingVertical: Platform.OS === "ios" ? 14 : 12,
  fontSize: 15,
  fontFamily: "Inter_400Regular" as const,
  marginBottom: 18,
  height: 50,
};
