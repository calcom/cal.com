/**
 * Toast Context
 *
 * Global toast context with provider that wraps the app.
 * Manages toast state globally and exposes showToast function via context.
 * Used for cross-platform alert system - shows native Alert on iOS/Android
 * and centered toast on web (browser extension).
 *
 * @example
 * ```tsx
 * import { ToastProvider, useToast } from '../contexts';
 *
 * // In root layout
 * <ToastProvider>
 *   <App />
 *   <GlobalToast />
 * </ToastProvider>
 *
 * // In any component
 * const { showToast } = useToast();
 * showToast("Success!", "Operation completed", "success");
 * ```
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { setGlobalToastFunction } from "@/utils/alerts";

export type ToastType = "success" | "error" | "info";

export interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: ToastState;
  showToast: (title: string, message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const INITIAL_TOAST_STATE: ToastState = {
  visible: false,
  title: "",
  message: "",
  type: "success",
};

const AUTO_DISMISS_MS = 2500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(INITIAL_TOAST_STATE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    setToast(INITIAL_TOAST_STATE);
  }, []);

  const showToast = useCallback(
    (title: string, message: string, type: ToastType = "success") => {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({ visible: true, title, message, type });

      // Set auto-dismiss timer
      timerRef.current = setTimeout(hideToast, AUTO_DISMISS_MS);
    },
    [hideToast]
  );

  // Register the global toast function for use in alerts.ts
  useEffect(() => {
    setGlobalToastFunction(showToast);

    return () => {
      setGlobalToastFunction(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access the global toast context.
 * Must be used within a ToastProvider.
 *
 * @returns Toast context value with toast state and control functions
 * @throws Error if used outside of ToastProvider
 */
export function useGlobalToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useGlobalToast must be used within a ToastProvider");
  }
  return context;
}
