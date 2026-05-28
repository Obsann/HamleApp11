import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useColors } from "@/hooks/useColors";
import { useGetUser, useUpdateUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import AnimatedTouchable from "@/components/AnimatedTouchable";

type Role = "teacher" | "parent";

export default function EditUserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: user, isLoading } = useGetUser(id ?? "");
  const { mutate: updateUser, isPending } = useUpdateUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("teacher");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRecoveryEmail(user.recoveryEmail || "");
      setRole(user.role as Role);
    }
  }, [user]);

  // --- Validation helpers ---
  const NAME_REGEX = /^[a-zA-Z\u1200-\u137F\s]+$/;
  const stripNonAlpha = (text: string) => text.replace(/[^a-zA-Z\u1200-\u137F\s]/g, "");
  const handleNameChange = (text: string) => setName(stripNonAlpha(text));

  function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Name and email are required.",
      });
      return;
    }
    if (!NAME_REGEX.test(name.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Name",
        text2: "Name must contain only letters.",
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address.",
      });
      return;
    }
    if (!recoveryEmail.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please enter a recovery email address.",
      });
      return;
    }
    if (!emailRegex.test(recoveryEmail.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid recovery email address.",
      });
      return;
    }
    if (password) {
      if (password.length < 8) {
        Toast.show({
          type: "error",
          text1: "Weak Password",
          text2: "Password must be at least 8 characters.",
        });
        return;
      }
      if (!/[a-z]/.test(password)) {
        Toast.show({
          type: "error",
          text1: "Weak Password",
          text2: "Password must contain at least one lowercase letter.",
        });
        return;
      }
      if (!/[A-Z]/.test(password)) {
        Toast.show({
          type: "error",
          text1: "Weak Password",
          text2: "Password must contain at least one uppercase letter.",
        });
        return;
      }
      if (!/[0-9]/.test(password)) {
        Toast.show({
          type: "error",
          text1: "Weak Password",
          text2: "Password must contain at least one number.",
        });
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        Toast.show({
          type: "error",
          text1: "Weak Password",
          text2: "Password must contain at least one special character (!@#$%^&* etc.).",
        });
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    updateUser(
      {
        id: id ?? "",
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          recoveryEmail: recoveryEmail.trim().toLowerCase(),
          password: password || undefined,
          role,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({
            type: "success",
            text1: "User Updated",
            text2: `${name} has been updated successfully.`,
          });
          router.back();
        },
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? "Failed to update user.";
          Toast.show({
            type: "error",
            text1: "Error",
            text2: msg,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 24 }}>
        Edit User
      </Text>

      <Text style={labelStyle(colors)}>Full Name</Text>
      <TextInput
        style={inputStyle(colors)}
        value={name}
        onChangeText={handleNameChange}
        placeholder="Full name"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
        maxLength={80}
      />

      <Text style={labelStyle(colors)}>Email Address</Text>
      <TextInput
        style={inputStyle(colors)}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={labelStyle(colors)}>Recovery Email Address *</Text>
      <TextInput
        style={inputStyle(colors)}
        value={recoveryEmail}
        onChangeText={setRecoveryEmail}
        placeholder="Recovery Email"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={labelStyle(colors)}>New Password</Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 6 }}>
        Leave blank to keep existing password
      </Text>
      <TextInput
        style={inputStyle(colors)}
        value={password}
        onChangeText={setPassword}
        placeholder="New password (optional)"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
      />

      <Text style={labelStyle(colors)}>Role</Text>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
        {(["teacher", "parent"] as Role[]).map((r) => (
          <AnimatedTouchable
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
                textAlign: "center",
              }}
            >
              {r}
            </Text>
          </AnimatedTouchable>
        ))}
      </View>

      <AnimatedTouchable
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
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" }}>
            Save Changes
          </Text>
        )}
      </AnimatedTouchable>
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
