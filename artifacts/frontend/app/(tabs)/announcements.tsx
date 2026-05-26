import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  useGetAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  getGetAnnouncementsQueryKey,
} from "@workspace/api-client-react";
import type { Announcement } from "@workspace/api-client-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const TARGET_ROLES = [
  { value: "all", label: "All Users" },
  { value: "teacher", label: "Teachers Only" },
  { value: "parent", label: "Parents Only" },
];

export default function AnnouncementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "admin";

  // Fetch announcements
  const {
    data: announcements,
    isLoading,
    refetch,
    isRefetching,
  } = useGetAnnouncements({ query: { staleTime: 1000 * 60 } as any });

  // Mutations
  const { mutate: createAnn, isPending: creating } = useCreateAnnouncement();
  const { mutate: updateAnn, isPending: updating } = useUpdateAnnouncement();
  const { mutate: deleteAnn, isPending: deleting } = useDeleteAnnouncement();

  // Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "teacher" | "parent">("all");

  // Deletion Confirm State
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const openCreateModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingAnn(null);
    setTitle("");
    setContent("");
    setTargetRole("all");
    setFormOpen(true);
  };

  const openEditModal = (ann: Announcement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingAnn(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setTargetRole(ann.targetRole as any);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Missing Fields", "Title and content are required.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (editingAnn) {
      // Edit mode
      updateAnn(
        {
          id: editingAnn.id,
          data: {
            title: title.trim(),
            content: content.trim(),
            targetRole,
          },
        },
        {
          onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: getGetAnnouncementsQueryKey() });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setFormOpen(false);
          },
          onError: (err: any) => {
            const msg = err?.response?.data?.message ?? "Failed to update announcement.";
            Alert.alert("Error", msg);
          },
        }
      );
    } else {
      // Create mode
      createAnn(
        {
          data: {
            title: title.trim(),
            content: content.trim(),
            targetRole,
          },
        },
        {
          onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: getGetAnnouncementsQueryKey() });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setFormOpen(false);
          },
          onError: (err: any) => {
            const msg = err?.response?.data?.message ?? "Failed to create announcement.";
            Alert.alert("Error", msg);
          },
        }
      );
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);

    deleteAnn(
      { id: targetId },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetAnnouncementsQueryKey() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to delete announcement.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const formatBadgeColor = (role: string) => {
    switch (role) {
      case "teacher":
        return { bg: "#E8EEF8", text: "#1B3D7A", label: "Teachers" };
      case "parent":
        return { bg: "#DCFCE7", text: "#16A34A", label: "Parents" };
      default:
        return { bg: "#F3F4F6", text: "#4B5563", label: "All Users" };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header Add Button */}
      {isAdmin && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={openCreateModal}>
            <Feather name="plus" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.createBtnText}>Add Announcement</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !announcements?.length ? (
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <Feather name="bell-off" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" }}>
            No announcements yet
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", marginTop: 6 }}>
            Important updates from school admins will appear here.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        >
          {announcements.map((item) => {
            const badge = formatBadgeColor(item.targetRole);
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDate(item.createdAt)}</Text>
                </View>

                <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.content, { color: colors.foreground }]}>{item.content}</Text>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.author, { color: colors.mutedForeground }]}>
                    Posted by: <Text style={{ fontFamily: "Inter_600SemiBold" }}>{item.authorName}</Text>
                  </Text>

                  {isAdmin && (
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                        <Feather name="edit-2" size={15} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setDeleteTarget(item);
                        }}
                        style={styles.actionBtn}
                      >
                        <Feather name="trash-2" size={15} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create / Edit Modal Sheet */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingAnn ? "Edit Announcement" : "Create Announcement"}
              </Text>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1, padding: 20 }}
              contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Announcement title"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.label}>Content *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    height: 120,
                    textAlignVertical: "top",
                    paddingTop: 12,
                  },
                ]}
                value={content}
                onChangeText={setContent}
                placeholder="Write announcement text details here..."
                placeholderTextColor={colors.mutedForeground}
                multiline
              />

              <Text style={styles.label}>Target Audience</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                {TARGET_ROLES.map((roleOption) => (
                  <TouchableOpacity
                    key={roleOption.value}
                    onPress={() => setTargetRole(roleOption.value as any)}
                    style={[
                      styles.segmentBtn,
                      {
                        borderColor: targetRole === roleOption.value ? colors.primary : colors.border,
                        backgroundColor: targetRole === roleOption.value ? colors.primary + "15" : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: targetRole === roleOption.value ? colors.primary : colors.mutedForeground,
                      }}
                    >
                      {roleOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: creating || updating ? colors.mutedForeground : colors.primary },
                ]}
                onPress={handleSave}
                disabled={creating || updating}
              >
                {creating || updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{editingAnn ? "Save Changes" : "Post Announcement"}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Delete Announcement?"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    lineHeight: 22,
  },
  content: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  author: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7A99",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
