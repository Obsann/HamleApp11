import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useGetDashboardSummary } from "@workspace/api-client-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}

function StatCard({ label, value, icon, color, bg }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  value: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const { data: summary, isLoading, refetch, isRefetching } = useGetDashboardSummary({
    query: { staleTime: 1000 * 60 } as any,
  });

  const styles = makeStyles(colors, insets);
  const roleLabel = user?.role === "admin" ? "Administrator" : user?.role === "teacher" ? "Teacher" : "Parent";
  const roleColor = colors.primary;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name?.split(" ")[0]}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); logout(); }}
        >
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.roleBadge}>
        <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
        <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Today at a Glance</Text>
          <View style={styles.statsRow}>
            <StatCard
              label="Students"
              value={summary?.totalStudents ?? 0}
              icon="users"
              color="#1B3D7A"
              bg="#E8EEF8"
            />
            <View style={{ width: 12 }} />
            <StatCard
              label="Present Today"
              value={summary?.presentToday ?? 0}
              icon="check-circle"
              color="#16A34A"
              bg="#DCFCE7"
            />
          </View>
          <View style={[styles.statsRow, { marginTop: 12 }]}>
            <StatCard
              label="Absent Today"
              value={summary?.absentToday ?? 0}
              icon="x-circle"
              color="#DC2626"
              bg="#FEE2E2"
            />
            <View style={{ width: 12 }} />
            <StatCard
              label="New Reports"
              value={summary?.recentReports ?? 0}
              icon="file-text"
              color="#D97706"
              bg="#FEF3C7"
            />
          </View>

          <View style={styles.attendanceCard}>
            <View>
              <Text style={styles.attendanceLabel}>Overall Attendance Rate</Text>
              <Text style={styles.attendanceValue}>{summary?.attendanceRate ?? 100}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(summary?.attendanceRate ?? 100, 100)}%` as any },
                ]}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/(tabs)/students")}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="users" size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionBtnText}>View Students</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/(tabs)/reports")}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="file-text" size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionBtnText}>View Reports</Text>
            </TouchableOpacity>
            
            {(user?.role === "admin" || user?.role === "teacher") && (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push("/add-attendance")}
                  activeOpacity={0.85}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="check-square" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.actionBtnText}>Record Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push("/add-report")}
                  activeOpacity={0.85}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="edit" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.actionBtnText}>Add Report</Text>
                </TouchableOpacity>
              </>
            )}
            
            {user?.role === "admin" && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push("/(tabs)/users")}
                activeOpacity={0.85}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="shield" size={22} color={colors.primary} />
                </View>
                <Text style={styles.actionBtnText}>Manage Users</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 100 },
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    userName: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 2 },
    logoutBtn: { padding: 8, backgroundColor: colors.muted, borderRadius: 10, marginTop: 4 },
    roleBadge: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
    roleDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    roleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 14, marginTop: 4 },
    statsRow: { flexDirection: "row" },
    attendanceCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      marginTop: 16,
      marginBottom: 24,
    },
    attendanceLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)", marginBottom: 6 },
    attendanceValue: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 14 },
    progressBar: { height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: "#F59E0B", borderRadius: 4 },
    actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    actionBtn: {
      flex: 1,
      minWidth: "44%",
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    actionIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    actionBtnText: { 
      fontSize: 14, 
      fontFamily: "Inter_600SemiBold", 
      color: colors.foreground, 
      textAlign: "center" 
    },
  });
}
