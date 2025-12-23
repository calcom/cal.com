import { Platform } from "react-native";

let cached: typeof import("expo-notifications") | null | undefined = undefined;

type ExpoNotificationsModule = typeof import("expo-notifications");

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const getErrorStack = (error: unknown) => (error instanceof Error ? error.stack : undefined);

const normalizeModule = (mod: unknown): unknown => {
  if (!mod || typeof mod !== "object") return mod;
  const maybeDefault = (mod as { default?: unknown }).default;
  return maybeDefault ?? mod;
};

const hasFn = (value: unknown, key: string): boolean => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record[key] === "function";
};

const isUsableExpoNotifications = (value: unknown): value is ExpoNotificationsModule => {
  // We rely on these APIs in booking reminders + response handling.
  return (
    hasFn(value, "getPermissionsAsync") &&
    hasFn(value, "requestPermissionsAsync") &&
    hasFn(value, "scheduleNotificationAsync") &&
    hasFn(value, "cancelScheduledNotificationAsync") &&
    hasFn(value, "setNotificationHandler") &&
    hasFn(value, "addNotificationResponseReceivedListener") &&
    hasFn(value, "getLastNotificationResponseAsync") &&
    hasFn(value, "setNotificationChannelAsync")
  );
};

/**
 * Lazy-load expo-notifications so the app doesn't hard-crash if the native module
 * isn't present in the currently installed dev client binary.
 *
 * Returns null if the module isn't available.
 */
export async function getExpoNotifications(): Promise<typeof import("expo-notifications") | null> {
  if (Platform.OS === "web") return null;
  if (cached !== undefined) return cached;

  try {
    const imported = await import("expo-notifications");
    const normalized = normalizeModule(imported);

    if (!isUsableExpoNotifications(normalized)) {
      cached = null;
      console.error(
        "expo-notifications module loaded but missing expected APIs (likely stale dev client)."
      );
      return null;
    }

    cached = normalized;
    return normalized;
  } catch (error) {
    cached = null;
    const message = getErrorMessage(error);
    console.error("expo-notifications native module not available", message);
    if (__DEV__) {
      console.debug("[expoNotifications] import failed", { message, stack: getErrorStack(error) });
    }
    return null;
  }
}
