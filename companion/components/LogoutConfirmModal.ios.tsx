import { useEffect, useRef } from "react";
import { Alert } from "react-native";

interface LogoutConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ visible, onConfirm, onCancel }: LogoutConfirmModalProps) {
  // Track if alert has been shown for current visible=true state to prevent re-triggering
  // when parent passes unstable callback references
  const alertShownRef = useRef(false);

  useEffect(() => {
    if (visible && !alertShownRef.current) {
      alertShownRef.current = true;
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

    if (!visible) {
      alertShownRef.current = false;
    }
  }, [visible, onConfirm, onCancel]);

  return null;
}
