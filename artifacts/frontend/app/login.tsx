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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { login } from "@workspace/api-client-react";
import type { AuthUser } from "@/context/AuthContext";

const { width, height } = Dimensions.get("window");

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
      } else if (err && err.message && (err.message.includes("Network") || err.message.includes("fetch"))) {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <LinearGradient
        colors={[colors.primary + "20", colors.background]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative Orbs */}
      <View style={[styles.orb, { backgroundColor: colors.primary, top: -100, right: -100 }]} />
      <View style={[styles.orb, { backgroundColor: colors.tint, bottom: -100, left: -100 }]} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 60), paddingBottom: Math.max(insets.bottom, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrapper, { shadowColor: colors.primary }]}>
            <LinearGradient colors={[colors.card, colors.background]} style={styles.iconGradient}>
              <Text style={styles.heroIcon}>🔐</Text>
            </LinearGradient>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enter your credentials to access the portal
          </Text>
        </View>

        <View style={[styles.cardWrapper, { shadowColor: colors.foreground }]}>
          <BlurView 
            intensity={Platform.OS === 'ios' ? 80 : 100} 
            tint={colors.background === '#0B0F19' ? 'dark' : 'light'} 
            style={[styles.card, { borderColor: colors.border, backgroundColor: Platform.OS === "android" ? colors.card : "transparent" }]}
          >
            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "1A", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-circle" size={16} color={colors.destructive} style={{ marginRight: 8 }} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.input + "50", borderColor: colors.border }]}>
                <Feather name="mail" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.input + "50", borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotPasswordButton}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                loading && { opacity: 0.7 }
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Sign In</Text>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to Welcome</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    padding: 24,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    height: "100%",
    outlineStyle: "none" as any,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    padding: 16,
  },
  backText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  }
});
