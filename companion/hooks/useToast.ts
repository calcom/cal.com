import { useCallback, useEffect, useState } from "react";

type ToastType = "success" | "error";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

/**
 * Hook for managing toast notifications with auto-dismiss functionality.
 *
 * @param autoDismissMs - Time in milliseconds before the toast auto-dismisses (default: 2500)
 * @returns Object containing toast state, showToast function, and hideToast function
 *
 * @example
 * ```tsx
 * const { toast, showToast } = useToast();
 *
 * // Show success toast
 * showToast("Operation completed successfully");
 *
 * // Show error toast
 * showToast("Something went wrong", "error");
 *
 * // Render toast
 * <Toast {...toast} />
 * ```
 */
export function useToast(autoDismissMs = 2500) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ visible: false, message: "", type: "success" });
  }, []);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(hideToast, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [toast, autoDismissMs, hideToast]);

  return { toast, showToast, hideToast };
}

export type { ToastState, ToastType };
