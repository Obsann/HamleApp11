import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useChangePassword, useUpdateUser } from "@workspace/api-client-react";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const systemScheme = useColorScheme();

  const { mutate: changePassword, isPending } = useChangePassword();
  const { mutate: updateUser, isPending: isUpdatingProfile } = useUpdateUser();

  // Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Profile Update State
  const [email, setEmail] = useState(user?.email || "");
  const [question1, setQuestion1] = useState(user?.securityQuestion1 || "");
  const [answer1, setAnswer1] = useState("");
  const [question2, setQuestion2] = useState(user?.securityQuestion2 || "");
  const [answer2, setAnswer2] = useState("");

  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "teacher"
      ? "Teacher"
      : "Parent Guardian";

  const roleColor =
    user?.role === "admin"
      ? "#7C3AED"
      : user?.role === "teacher"
      ? "#1B3D7A"
      : "#16A34A";

  const handlePasswordChange = () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing Fields", "Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Mismatch", "New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "New password must be at least 6 characters.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    changePassword(
      {
        data: {
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        },
      },
      {
        onSuccess: (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Success", res.message || "Password changed successfully.");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to change password. Please check your current password.";
          Alert.alert("Error", msg);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => logout() },
      ]
    );
  };

  const handleUpdateProfile = () => {
    if (!user?.id) return;

    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // Prepare update payload
    const payload: any = {
      email: email.trim()
    };

    // If they want to update questions, they must provide all fields
    const isUpdatingQuestions = question1.trim() || answer1.trim() || question2.trim() || answer2.trim();
    if (isUpdatingQuestions) {
      if (!question1.trim() || !answer1.trim() || !question2.trim() || !answer2.trim()) {
        Alert.alert("Missing Fields", "To update security questions, you must provide BOTH questions and BOTH answers.");
        return;
      }
      payload.securityQuestion1 = question1.trim();
      payload.securityAnswer1 = answer1.trim();
      payload.securityQuestion2 = question2.trim();
      payload.securityAnswer2 = answer2.trim();
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateUser(
      { id: user.id, data: payload },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Success", "Profile updated successfully! If you changed your email, you will need to use it for your next login.");
          if (isUpdatingQuestions) {
            setAnswer1("");
            setAnswer2("");
          }
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to update profile.";
          Alert.alert("Error", msg);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: roleColor + "15" }]}>
          <Feather name="user" size={32} color={roleColor} />
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {/* Theme Settings Display */}
      <Text style={styles.sectionTitle}>App Preferences</Text>
      <View style={[styles.preferenceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.preferenceRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Feather name="moon" size={20} color={colors.foreground} />
            <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Theme Mode</Text>
          </View>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary, textTransform: "capitalize" }}>
            {systemScheme === "dark" ? "Dark Mode" : "Light Mode"} (System)
          </Text>
        </View>
      </View>

      {/* Security Info Form */}
      <Text style={styles.sectionTitle}>Security Settings</Text>
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Email Address (For Login & Recovery)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Security Question 1</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={question1}
          onChangeText={setQuestion1}
          placeholder="e.g. What is your mother's maiden name?"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Answer 1</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={answer1}
          onChangeText={setAnswer1}
          placeholder="New Answer (leaves unchanged if blank)"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Security Question 2</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={question2}
          onChangeText={setQuestion2}
          placeholder="e.g. What city were you born in?"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Answer 2</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={answer2}
          onChangeText={setAnswer2}
          placeholder="New Answer (leaves unchanged if blank)"
          placeholderTextColor={colors.mutedForeground}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isUpdatingProfile ? colors.mutedForeground : colors.primary }]}
          onPress={handleUpdateProfile}
          disabled={isUpdatingProfile}
        >
          {isUpdatingProfile ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Security Settings</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Password Change Form */}
      <Text style={styles.sectionTitle}>Change Password</Text>
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Current Password</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
        />

        <Text style={[styles.inputLabel, { color: colors.foreground }]}>New Password</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
        />

        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Confirm New Password</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isPending ? colors.mutedForeground : colors.primary }]}
          onPress={handlePasswordChange}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Log Out */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.destructive }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color={colors.destructive} style={{ marginRight: 8 }} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 16,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#6B7A99",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  preferenceCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preferenceLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  formCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
  },
  saveBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  logoutBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
