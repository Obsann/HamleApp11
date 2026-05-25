import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import { useGetStudents } from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";

function StudentCard({ student, onPress }: { student: Student; onPress: () => void }) {
  const colors = useColors();
  const initials = `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
  const gradeColors = ["#1B3D7A", "#7C3AED", "#16A34A", "#D97706", "#DC2626"];
  const colorIndex = student.grade.charCodeAt(student.grade.length - 1) % gradeColors.length;
  const avatarColor = gradeColors[colorIndex];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{student.firstName} {student.lastName}</Text>
        <Text style={[styles.grade, { color: colors.mutedForeground }]}>{student.grade}</Text>
        {student.teacherName && (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            <Feather name="user" size={11} /> {student.teacherName}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  grade: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
});

export default function StudentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: students, isLoading, refetch, isRefetching } = useGetStudents();

  const isAdmin = user?.role === "admin";

  const filtered = students?.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q)
    );
  }) ?? [];

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>
            Students
          </Text>
          {isAdmin && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/add-student");
              }}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Add Student</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: colors.card, borderRadius: 12,
          paddingHorizontal: 14, marginBottom: 8,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={{ flex: 1, height: 46, marginLeft: 10, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground }}
            placeholder="Search students..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StudentCard
              student={item}
              onPress={() => router.push(`/student/${item.id}` as any)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 100,
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 12 }}>
                {search ? "No students match your search" : "No students found"}
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
