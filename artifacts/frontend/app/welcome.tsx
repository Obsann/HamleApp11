import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleLoginPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "1A", colors.background]}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 60), paddingBottom: Math.max(insets.bottom, 40) }]}>
        
        <View style={styles.heroSection}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
            <Text style={{ fontSize: 48 }}>🏫</Text>
          </View>
          
          <Text style={[styles.title, { color: colors.foreground }]}>
            Hamle <Text style={{ color: colors.primary }}>SIS</Text>
          </Text>
          
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Empowering education through seamless student information management.
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <FeatureItem icon="📝" title="Grades & Reports" desc="Track student progress with ease" colors={colors} />
          <FeatureItem icon="📅" title="Attendance" desc="Monitor daily presence securely" colors={colors} />
          <FeatureItem icon="🔒" title="Secure Access" desc="Role-based permissions for staff & parents" colors={colors} />
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleLoginPress}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Log In to Continue</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

function FeatureItem({ icon, title, desc, colors }: { icon: string, title: string, desc: string, colors: any }) {
  return (
    <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  heroSection: {
    alignItems: "center",
    marginTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: Platform.OS === "web" ? 500 : width * 0.8,
  },
  featuresSection: {
    flex: 1,
    justifyContent: "center",
    maxWidth: Platform.OS === "web" ? 600 : "100%",
    width: "100%",
    alignSelf: "center",
    gap: 16,
    marginVertical: 40,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  actionSection: {
    alignItems: "center",
    maxWidth: Platform.OS === "web" ? 400 : "100%",
    width: "100%",
    alignSelf: "center",
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
});
