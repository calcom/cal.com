import type React from "react";
import type { ModalProps } from "react-native";

export interface FullScreenModalProps extends ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

export declare function FullScreenModal(props: FullScreenModalProps): JSX.Element;
