import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { login } from "@workspace/api-client-react";
import type { AuthUser } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login: saveAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors, insets);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email: email.trim().toLowerCase(), password });
      await saveAuth(result.token, result.user as AuthUser);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err && err.status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (err && err.status === 429) {
        setError("Too many login attempts. Please try again in 15 minutes.");
      } else if (err && err.message && (err.message.includes("Network") || err.message.includes("fetch") || err.message.includes("Failed to fetch") || err.message.includes("network"))) {
        setError("Unable to connect to the server. Please verify the backend is running.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.schoolName}>Hamle Elementary</Text>
            <Text style={styles.subtitle}>Student Information System</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo Accounts</Text>
              <Text style={styles.demoEntry}>Admin: admin@hamle.edu / admin123</Text>
              <Text style={styles.demoEntry}>Teacher: teacher@hamle.edu / teacher123</Text>
              <Text style={styles.demoEntry}>Parent: parent@hamle.edu / parent123</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    container: {
      flexGrow: 1,
      paddingTop: top + 24,
      paddingBottom: insets.bottom + 34,
      paddingHorizontal: 24,
    },
    header: {
      alignItems: "center",
      marginBottom: 32,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 20,
      marginBottom: 16,
    },
    schoolName: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.75)",
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    cardTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 20,
    },
    errorBox: {
      backgroundColor: "#FEF2F2",
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.destructive,
    },
    errorText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.destructive,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    passwordContainer: {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
    },
    passwordInput: {
      flex: 1,
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingLeft: 16,
      paddingRight: 50,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    eyeButton: {
      position: "absolute",
      right: 16,
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    button: {
      height: 54,
      backgroundColor: colors.primary,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      letterSpacing: 0.2,
    },
    demoBox: {
      marginTop: 24,
      padding: 14,
      backgroundColor: colors.secondary,
      borderRadius: 10,
    },
    demoTitle: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    demoEntry: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      marginBottom: 3,
    },
  });
}
