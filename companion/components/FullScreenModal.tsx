import React, { useEffect } from "react";
import { Modal, ModalProps, Platform, View } from "react-native";

interface FullScreenModalProps extends ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

/**
 * A modal wrapper that expands the browser extension iframe to full screen
 * when running in the web platform (browser extension).
 *
 * For mobile platforms, it behaves like a regular Modal.
 */
export function FullScreenModal({
  visible,
  onRequestClose,
  children,
  ...modalProps
}: FullScreenModalProps) {
  useEffect(() => {
    // Only send expand/collapse messages on web platform (browser extension)
    if (Platform.OS !== "web") {
      return;
    }

    if (visible) {
      // Expand the iframe to full width when modal opens
      window.parent.postMessage({ type: "cal-companion-expand" }, "*");
    } else {
      // Collapse the iframe back to 400px when modal closes
      window.parent.postMessage({ type: "cal-companion-collapse" }, "*");
    }

    // Cleanup: collapse on unmount if still visible
    return () => {
      if (visible && Platform.OS === "web") {
        window.parent.postMessage({ type: "cal-companion-collapse" }, "*");
      }
    };
  }, [visible]);

  // For non-web platforms, just use the regular Modal
  if (Platform.OS !== "web") {
    return (
      <Modal visible={visible} onRequestClose={onRequestClose} {...modalProps}>
        {children}
      </Modal>
    );
  }

  // For web platform (browser extension), use the modal with full-screen behavior
  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      transparent
      animationType="fade"
      {...modalProps}
    >
      {children}
    </Modal>
  );
}
