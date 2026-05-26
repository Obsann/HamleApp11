import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardsFadeAnim = useRef(new Animated.Value(0)).current;
  const cardsSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]),
      Animated.parallel([
        Animated.timing(cardsFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(cardsSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  const handleLoginPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Background Gradient */}
      <LinearGradient
        colors={[colors.primary + "30", colors.background, colors.background]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative Orbs */}
      <View style={[styles.orb, { backgroundColor: colors.primary, top: -50, left: -50 }]} />
      <View style={[styles.orb, { backgroundColor: colors.tint, top: 150, right: -100, width: 250, height: 250 }]} />
      
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 80), paddingBottom: Math.max(insets.bottom, 40) }]}>
        
        <Animated.View 
          style={[
            styles.heroSection, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={[styles.iconWrapper, { shadowColor: colors.primary }]}>
            <LinearGradient
              colors={[colors.card, colors.background]}
              style={styles.iconGradient}
            >
              <Text style={styles.heroIcon}>🎓</Text>
            </LinearGradient>
          </View>
          
          <Text style={[styles.title, { color: colors.foreground }]}>
            Hamle <Text style={{ color: colors.primary }}>Elementary</Text>
          </Text>
          
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            A secure, unified portal connecting teachers, students, and parents to foster academic excellence.
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.featuresSection,
            { opacity: cardsFadeAnim, transform: [{ translateY: cardsSlideAnim }] }
          ]}
        >
          <FeatureCard 
            icon="📊" 
            title="Real-Time Insights" 
            desc="Track academic progress, attendance, and behavioral reports instantly." 
            colors={colors} 
          />
          <FeatureCard 
            icon="🤝" 
            title="Seamless Connection" 
            desc="Direct communication channels bridging the gap between school and home." 
            colors={colors} 
          />
          <FeatureCard 
            icon="🔐" 
            title="Role-Based Security" 
            desc="Enterprise-grade data protection ensuring privacy for every user." 
            colors={colors} 
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.actionSection,
            { opacity: cardsFadeAnim, transform: [{ translateY: cardsSlideAnim }] }
          ]}
        >
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={handleLoginPress}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.15)", "transparent"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Access Portal</Text>
          </TouchableOpacity>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Authorized Personnel & Guardians Only
          </Text>
        </Animated.View>

      </View>
    </View>
  );
}

function FeatureCard({ icon, title, desc, colors }: { icon: string, title: string, desc: string, colors: any }) {
  return (
    <View style={[styles.featureCardContainer, { shadowColor: colors.foreground }]}>
      <BlurView 
        intensity={Platform.OS === 'ios' ? 80 : 100} 
        tint={colors.background === '#0B0F19' ? 'dark' : 'light'} 
        style={[styles.featureCard, { borderColor: colors.border }]}
      >
        <View style={[styles.featureIconContainer, { backgroundColor: colors.primary + "15" }]}>
          <Text style={styles.featureIcon}>{icon}</Text>
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={[styles.featureTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{desc}</Text>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    zIndex: 1,
  },
  heroSection: {
    alignItems: "center",
    marginTop: 20,
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 32,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 53,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    fontSize: 52,
  },
  title: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: Platform.OS === "web" ? 500 : width * 0.85,
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
  featureCardContainer: {
    borderRadius: 20,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderWidth: 1,
    backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.7)" : "transparent",
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  actionSection: {
    alignItems: "center",
    maxWidth: Platform.OS === "web" ? 400 : "100%",
    width: "100%",
    alignSelf: "center",
  },
  button: {
    width: "100%",
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.7,
  }
});
