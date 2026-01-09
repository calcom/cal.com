/**
 * Global Toast Component
 *
 * A centered toast notification component for web/browser extension.
 * Displays in the center of the screen with a subtle backdrop blur effect.
 *
 * Features:
 * - Centered horizontally and vertically
 * - Clean, minimal, professional design
 * - Subtle backdrop blur effect
 * - Rounded card with shadow
 * - Icon based on type (checkmark for success, X for error, info circle for info)
 * - Title in bold, message in regular weight
 * - Fade in/out animation
 * - Auto-dismiss after 2500ms (handled by ToastProvider)
 *
 * @example
 * ```tsx
 * import { GlobalToast } from '@/components/ui/GlobalToast';
 * import { ToastProvider } from '@/contexts/ToastContext';
 *
 * // In root layout
 * <ToastProvider>
 *   <App />
 *   <GlobalToast />
 * </ToastProvider>
 * ```
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { useGlobalToast, type ToastType } from "@/contexts/ToastContext";

const ICON_CONFIG: Record<ToastType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: "checkmark-circle", color: "#000000" },
  error: { name: "close-circle", color: "#000000" },
  info: { name: "information-circle", color: "#000000" },
};

export function GlobalToast() {
  const { toast } = useGlobalToast();
  // Use useState to preserve Animated.Value instance across renders
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (toast.visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [toast.visible, fadeAnim]);

  // Expand iframe on web when toast is visible (to center on screen)
  useEffect(() => {
    if (Platform.OS === "web") {
      if (toast.visible) {
        window.parent.postMessage({ type: "cal-companion-expand" }, "*");
      } else {
        window.parent.postMessage({ type: "cal-companion-collapse" }, "*");
      }
    }

    return () => {
      // Cleanup: collapse on unmount if we expanded
      if (Platform.OS === "web" && toast.visible) {
        window.parent.postMessage({ type: "cal-companion-collapse" }, "*");
      }
    };
  }, [toast.visible]);

  // Only render on web platform
  if (Platform.OS !== "web") {
    return null;
  }

  if (!toast.visible) {
    return null;
  }

  const iconConfig = ICON_CONFIG[toast.type];

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{toast.title}</Text>
          {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    maxWidth: 640,
    minWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: "400",
    color: "#374151",
    lineHeight: 18,
  },
});
