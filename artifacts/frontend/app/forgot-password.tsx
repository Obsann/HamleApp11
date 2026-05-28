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
  ScrollView 
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { getSecurityQuestions, forgotPassword } from "@workspace/api-client-react";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 State
  const [question1, setQuestion1] = useState("");
  const [question2, setQuestion2] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");

  const handleFetchQuestions = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await getSecurityQuestions({ email: email.trim() });
      setQuestion1(res.question1);
      setQuestion2(res.question2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(2);
    } catch (err: any) {
      const msg = err?.data?.message ?? err?.message ?? "Could not find account or security questions.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!answer1.trim() || !answer2.trim()) {
      setError("Please answer both security questions.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword({
        email: email.trim(),
        answer1: answer1.trim(),
        answer2: answer2.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Wait for success screen or alert, then route
      alert("A temporary password has been emailed to you.");
      router.replace("/login");
    } catch (err: any) {
      const msg = err?.data?.message ?? err?.message ?? "Incorrect security answers. Please try again.";
      setError(msg);
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
          <Text style={[styles.title, { color: colors.foreground }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {step === 1 ? "Enter your email to answer your security questions." : "Answer your security questions to receive a temporary password."}
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

            {step === 1 ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.input + "50", borderColor: colors.border }]}>
                    <Feather name="mail" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="name@example.com"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                      //@ts-ignore
                      outlineStyle="none"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.primary, shadowColor: colors.primary },
                    loading && { opacity: 0.7 }
                  ]}
                  onPress={handleFetchQuestions}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.primary, marginBottom: 8 }]}>Q1: {question1}</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.input + "50", borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, paddingHorizontal: 0 }]}
                      value={answer1}
                      onChangeText={setAnswer1}
                      placeholder="Your answer"
                      placeholderTextColor={colors.mutedForeground}
                      editable={!loading}
                      //@ts-ignore
                      outlineStyle="none"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.primary, marginBottom: 8 }]}>Q2: {question2}</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.input + "50", borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, paddingHorizontal: 0 }]}
                      value={answer2}
                      onChangeText={setAnswer2}
                      placeholder="Your answer"
                      placeholderTextColor={colors.mutedForeground}
                      editable={!loading}
                      //@ts-ignore
                      outlineStyle="none"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.primary, shadowColor: colors.primary },
                    loading && { opacity: 0.7 }
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </BlurView>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to Log In</Text>
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
    filter: "blur(40px)",
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
    marginTop: 8,
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
