import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useGetUsers, useDeleteUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import type { UserDetail } from "@workspace/api-client-react";

const ROLE_CONFIG = {
  teacher: { bg: "#E8EEF8", text: "#1B3D7A", label: "Teacher", icon: "book" as const },
  parent:  { bg: "#FEF3C7", text: "#D97706", label: "Parent",  icon: "heart" as const },
  admin:   { bg: "#F3E8FF", text: "#7C3AED", label: "Admin",   icon: "shield" as const },
};

type RoleFilter = "all" | "teacher" | "parent";

function UserCard({
  user,
  onEdit,
  onDelete,
}: {
  user: UserDetail;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.teacher;
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: cfg.bg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: cfg.text }}>
          {initials}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
          {user.name}
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>
          {user.email}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
          <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: cfg.text }}>{cfg.label}</Text>
          </View>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            {user.studentCount} {user.studentCount === 1 ? "student" : "students"}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          onPress={onEdit}
          style={{ padding: 8, backgroundColor: colors.secondary, borderRadius: 10 }}
        >
          <Feather name="edit-2" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{ padding: 8, backgroundColor: "#FEE2E2", borderRadius: 10 }}
        >
          <Feather name="trash-2" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function UsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<RoleFilter>("all");

  const queryRole = filter === "all" ? undefined : filter;
  const { data: users, isLoading, refetch, isRefetching } = useGetUsers({ role: queryRole });
  const { mutate: deleteUser } = useDeleteUser();

  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const filters: Array<{ key: RoleFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "teacher", label: "Teachers" },
    { key: "parent", label: "Parents" },
  ];

  function handleDelete(user: UserDetail) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete User",
      `Remove ${user.name} from the system? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteUser(
              { id: user.id },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
                },
                onError: () => {
                  Alert.alert("Error", "Failed to delete user. Please try again.");
                },
              }
            );
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>
            Manage Users
          </Text>
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
              router.push("/add-user");
            }}
          >
            <Feather name="user-plus" size={16} color="#fff" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filter === f.key ? colors.primary : colors.secondary,
              }}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: filter === f.key ? "#fff" : colors.foreground,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onEdit={() => router.push({ pathname: "/edit-user", params: { id: item.id } })}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_500Medium",
                  color: colors.mutedForeground,
                  marginTop: 12,
                }}
              >
                No users found
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
