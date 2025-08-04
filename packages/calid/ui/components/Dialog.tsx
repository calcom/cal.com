import * as RadixDialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import * as React from "react";

import CircularLoader from "./CircularLoader";

// Assuming you have a Loader component
type Variant = "danger" | "warning" | "success";
type Size = "md" | "lg" | "xl";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: Variant;
  title: string;
  description?: string;
  confirmBtnText: string;
  cancelBtnText?: string;
  onConfirm: () => Promise<void> | void;
  size?: Size;
  loader?: boolean;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  variant,
  title,
  description,
  confirmBtnText,
  cancelBtnText,
  onConfirm,
  size = "md",
  loader = false,
  children,
}) => {
  const handleConfirm = async () => {
    onConfirm();
  };

  const variantConfig: Record<Variant, { icon: React.ReactNode; color: string }> = {
    danger: {
      icon: <XCircle size={24} color="#dc2626" />,
      color: "#dc2626",
    },
    warning: {
      icon: <AlertTriangle size={24} color="#f59e0b" />,
      color: "#f59e0b",
    },
    success: {
      icon: <CheckCircle size={24} color="#16a34a" />,
      color: "#16a34a",
    },
  };

  const sizeMap: Record<Size, number> = {
    md: 400,
    lg: 600,
    xl: 800,
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          style={{
            backgroundColor: "rgba(0,0,0,0.4)",
            position: "fixed",
            inset: 0,
          }}
        />
        <RadixDialog.Content
          style={{
            backgroundColor: "white",
            borderRadius: 6,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            padding: 24,
            width: "90%",
            maxWidth: sizeMap[size],
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}>
            <span aria-hidden>{variantConfig[variant].icon}</span>
            <RadixDialog.Title style={{ fontSize: 18, fontWeight: 600 }}>{title}</RadixDialog.Title>
          </div>

          {description && (
            <RadixDialog.Description style={{ marginBottom: 20, fontSize: 14, color: "#555" }}>
              {description}
            </RadixDialog.Description>
          )}
          {children}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}>
            {cancelBtnText && (
              <RadixDialog.Close asChild>
                <button
                  type="button"
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    background: "white",
                    cursor: "pointer",
                  }}>
                  {cancelBtnText}
                </button>
              </RadixDialog.Close>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loader}
              style={{
                padding: "6px 12px",
                border: "none",
                borderRadius: 4,
                background: variantConfig[variant].color,
                color: "white",
                cursor: loader ? "not-allowed" : "pointer",
                opacity: loader ? 0.8 : 1,
              }}>
              <div className="flex items-center gap-2">
                {loader && <CircularLoader />}
                {confirmBtnText}
              </div>
            </button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
