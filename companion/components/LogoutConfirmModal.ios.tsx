import { useEffect } from "react";
import { Alert } from "react-native";

interface LogoutConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

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

  return null;
}
