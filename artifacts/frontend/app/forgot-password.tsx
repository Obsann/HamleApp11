import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

  // Step 2 State
  const [question1, setQuestion1] = useState("");
  const [question2, setQuestion2] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");

  const handleFetchQuestions = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await getSecurityQuestions({ email: email.trim() });
      setQuestion1(res.question1);
      setQuestion2(res.question2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(2);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Could not find account or security questions.";
      Alert.alert("Error", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!answer1.trim() || !answer2.trim()) {
      Alert.alert("Missing Answers", "Please answer both security questions.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword({
        email: email.trim(),
        answer1: answer1.trim(),
        answer2: answer2.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Password Reset Sent",
        "A temporary password has been emailed to you. Please log in and change your password.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Incorrect security answers. Please try again.";
      Alert.alert("Verification Failed", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {step === 1 ? "Enter your email to answer your security questions." : "Answer your security questions to receive a temporary password."}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {step === 1 ? (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your registered email"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: loading ? colors.mutedForeground : colors.primary }]}
              onPress={handleFetchQuestions}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.questionText, { color: colors.primary }]}>Question 1: {question1}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, marginBottom: 20 }]}
              value={answer1}
              onChangeText={setAnswer1}
              placeholder="Your answer"
              placeholderTextColor={colors.mutedForeground}
              editable={!loading}
            />

            <Text style={[styles.questionText, { color: colors.primary }]}>Question 2: {question2}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, marginBottom: 24 }]}
              value={answer2}
              onChangeText={setAnswer2}
              placeholder="Your answer"
              placeholderTextColor={colors.mutedForeground}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: loading ? colors.mutedForeground : colors.primary }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
      
      <TouchableOpacity 
        style={{ alignItems: "center", marginTop: 24 }}
        onPress={() => router.back()}
      >
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
          Back to Log In
        </Text>
      </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
