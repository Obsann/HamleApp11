import React, { useState, useMemo } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useGetStudents } from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";

import AnimatedTouchable from "@/components/AnimatedTouchable";
import { SkeletonList } from "@/components/SkeletonLoader";

function StudentCard({ student, onPress }: { student: Student; onPress: () => void }) {
  const colors = useColors();
  const initials = `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
  const gradeColors = ["#1B3D7A", "#7C3AED", "#16A34A", "#D97706", "#DC2626"];
  const colorIndex = student.grade.charCodeAt(student.grade.length - 1) % gradeColors.length;
  const avatarColor = gradeColors[colorIndex]!;

  return (
    <AnimatedTouchable
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => { onPress(); }}
      activeScale={0.96}
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
        {student.parentName && (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            <Feather name="home" size={11} /> {student.parentName}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </AnimatedTouchable>
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

  // Read pre-filter params from navigation (e.g. from Users screen)
  const params = useLocalSearchParams<{
    teacherId?: string;
    teacherName?: string;
    parentId?: string;
    parentName?: string;
  }>();
  const filterTeacherId = params.teacherId;
  const filterTeacherName = params.teacherName;
  const filterParentId = params.parentId;
  const filterParentName = params.parentName;

  const hasExternalFilter = !!filterTeacherId || !!filterParentId;

  const { data: students, isLoading, refetch, isRefetching } = useGetStudents();

  const isAdmin = user?.role === "admin";

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const filtered = useMemo(() => {
    let list = students ?? [];

    // Apply external filter from Users screen navigation
    if (filterTeacherId) {
      list = list.filter((s) => s.teacherId === filterTeacherId);
    } else if (filterParentId) {
      list = list.filter((s) => s.parentId === filterParentId);
    }

    // Apply local search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.grade.toLowerCase().includes(q)
      );
    }

    return list;
  }, [students, filterTeacherId, filterParentId, search]);

  // Compute filter banner label
  const filterBannerLabel = filterTeacherName
    ? `Teacher: ${filterTeacherName}`
    : filterParentName
    ? `Parent: ${filterParentName}`
    : null;

  function clearExternalFilter() {
    router.setParams({ teacherId: undefined, teacherName: undefined, parentId: undefined, parentName: undefined } as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>
            {user?.role === "parent" ? "My Children" : "Students"}
          </Text>
          {isAdmin && (
            <AnimatedTouchable
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
              onPress={() => router.push("/add-student")}
              activeScale={0.9}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Add Student</Text>
            </AnimatedTouchable>
          )}
        </View>

        {/* External filter banner */}
        {hasExternalFilter && filterBannerLabel && (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.primary + "15",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.primary + "30",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="filter" size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
                Filtered by {filterBannerLabel}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                ({filtered.length} student{filtered.length !== 1 ? "s" : ""})
              </Text>
            </View>
            <AnimatedTouchable
              onPress={clearExternalFilter}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              activeScale={0.9}
            >
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>
                Clear
              </Text>
            </AnimatedTouchable>
          </View>
        )}

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
            <AnimatedTouchable onPress={() => setSearch("")} activeScale={0.9}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </AnimatedTouchable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={{ marginTop: 20 }}>
          <SkeletonList count={5} />
        </View>
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
                {hasExternalFilter
                  ? `No students found for this ${filterTeacherId ? "teacher" : "parent"}`
                  : search
                  ? "No students match your search"
                  : "No students found"}
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
