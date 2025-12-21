import React from "react";
import { Modal, ModalProps } from "react-native";

interface FullScreenModalProps extends ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

/**
 * Native-specific modal wrapper.
 *
 * On native platforms (iOS/Android), this is a simple pass-through to the
 * React Native Modal component without any iframe expansion logic.
 */
export function FullScreenModal({
  visible,
  onRequestClose,
  children,
  ...modalProps
}: FullScreenModalProps) {
  return (
    <Modal visible={visible} onRequestClose={onRequestClose} {...modalProps}>
      {children}
    </Modal>
  );
}
