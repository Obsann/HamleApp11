import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = useColors();

  const handleConfirm = () => {
    Haptics.notificationAsync(
      isDestructive
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    );
    onConfirm();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconWrapper,
                {
                  backgroundColor: isDestructive
                    ? `${colors.destructive}15`
                    : `${colors.primary}15`,
                },
              ]}
            >
              <Feather
                name={isDestructive ? "alert-triangle" : "info"}
                size={28}
                color={isDestructive ? colors.destructive : colors.primary}
              />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>

          <Text style={[styles.message, { color: colors.mutedForeground }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: colors.muted },
              ]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, { color: colors.mutedForeground }]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.button,
                {
                  backgroundColor: isDestructive
                    ? colors.destructive
                    : colors.primary,
                },
              ]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: "#ffffff" }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {},
  buttonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
