import React, { useEffect } from "react";
import { Alert } from "react-native";

interface LogoutConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * iOS-specific LogoutConfirmModal using native Alert.
 *
 * On iOS, we use the native Alert.alert for a better user experience
 * that matches iOS design patterns instead of a custom modal overlay.
 */
export function LogoutConfirmModal({ visible, onConfirm, onCancel }: LogoutConfirmModalProps) {
  useEffect(() => {
    if (visible) {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: onCancel,
          },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: onConfirm,
          },
        ],
        { cancelable: true, onDismiss: onCancel }
      );
    }
  }, [visible, onConfirm, onCancel]);

  // No UI rendered - Alert.alert handles the display
  return null;
}
