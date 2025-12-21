import React, { useEffect } from "react";
import { Modal, ModalProps } from "react-native";

interface FullScreenModalProps extends ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

/**
 * Web-specific modal wrapper that expands the browser extension iframe to full screen.
 *
 * This component sends postMessage events to the parent window (content script)
 * to expand/collapse the iframe when the modal opens/closes.
 */
export function FullScreenModal({
  visible,
  onRequestClose,
  children,
  ...modalProps
}: FullScreenModalProps) {
  useEffect(() => {
    if (visible) {
      // Expand the iframe to full width when modal opens
      window.parent.postMessage({ type: "cal-companion-expand" }, "*");
    } else {
      // Collapse the iframe back to 400px when modal closes
      window.parent.postMessage({ type: "cal-companion-collapse" }, "*");
    }

    // Cleanup: collapse on unmount if still visible
    return () => {
      if (visible) {
        window.parent.postMessage({ type: "cal-companion-collapse" }, "*");
      }
    };
  }, [visible]);

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
