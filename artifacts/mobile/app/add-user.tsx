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
  const [role, setRole] = useState<Role>("teacher");

  const { mutate: createUser, isPending } = useCreateUser();

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please fill in name, email, and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createUser(
      { data: { name: name.trim(), email: email.trim().toLowerCase(), password, role } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          router.back();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to create user. Please try again.";
          Alert.alert("Error", msg);
        },
      }
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: insets.bottom + 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 24 }}>
        Add New User
      </Text>

      <Text style={labelStyle(colors)}>Full Name</Text>
      <TextInput
        style={inputStyle(colors)}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Tigist Alemu"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
      />

      <Text style={labelStyle(colors)}>Email Address</Text>
      <TextInput
        style={inputStyle(colors)}
        value={email}
        onChangeText={setEmail}
        placeholder="e.g. tigist@hamle.edu"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={labelStyle(colors)}>Password</Text>
      <TextInput
        style={inputStyle(colors)}
        value={password}
        onChangeText={setPassword}
        placeholder="Minimum 6 characters"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
      />

      <Text style={labelStyle(colors)}>Role</Text>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
        {(["teacher", "parent"] as Role[]).map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRole(r)}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 2,
              borderColor: role === r ? colors.primary : colors.border,
              backgroundColor: role === r ? colors.primary + "15" : colors.card,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: role === r ? colors.primary : colors.mutedForeground,
                textTransform: "capitalize",
              }}
            >
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isPending ? colors.mutedForeground : colors.primary,
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: "center",
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

function labelStyle(colors: any) {
  return {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold" as const,
    color: colors.foreground,
    marginBottom: 6,
  };
}

function inputStyle(colors: any) {
  return {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular" as const,
    color: colors.foreground,
    marginBottom: 18,
  };
}
