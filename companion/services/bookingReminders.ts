import { Platform } from "react-native";

import type { Booking } from "./calcom";
import { BOOKING_REMINDER_MINUTES } from "../config/notifications.config";
import { generalStorage } from "../utils/storage";
import { getExpoNotifications } from "./expoNotifications";

type BookingReminderEntry = {
  notificationId: string;
  startTimeIso: string;
  fireAtIso: string;
};

type BookingReminderStore = {
  version: 1;
  scheduled: Record<string, BookingReminderEntry>;
};

const STORE_VERSION = 1 as const;
const STORAGE_KEY_PREFIX = "cal_booking_reminders";
const ANDROID_CHANNEL_ID = "booking-reminders";

let didInit = false;

const noop = () => undefined;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const getErrorStack = (error: unknown) => (error instanceof Error ? error.stack : undefined);

export const getBookingRemindersUserKey = (userInfo: unknown): string | null => {
  if (!userInfo || typeof userInfo !== "object") return null;

  const candidate = userInfo as { id?: unknown; email?: unknown };
  if (typeof candidate.id === "number" && Number.isFinite(candidate.id)) {
    return `id:${candidate.id}`;
  }
  if (typeof candidate.email === "string" && candidate.email.trim().length > 0) {
    return `email:${candidate.email.trim().toLowerCase()}`;
  }
  return null;
};

const getStorageKey = (userKey: string) => `${STORAGE_KEY_PREFIX}:${userKey}`;

const parseStore = (raw: string | null): BookingReminderStore => {
  if (!raw) return { version: STORE_VERSION, scheduled: {} };

  try {
    const parsed = JSON.parse(raw) as BookingReminderStore;
    if (
      parsed?.version !== STORE_VERSION ||
      !parsed.scheduled ||
      typeof parsed.scheduled !== "object"
    ) {
      return { version: STORE_VERSION, scheduled: {} };
    }
    return parsed;
  } catch {
    return { version: STORE_VERSION, scheduled: {} };
  }
};

const readStore = async (userKey: string): Promise<BookingReminderStore> => {
  const raw = await generalStorage.getItem(getStorageKey(userKey));
  return parseStore(raw);
};

const writeStore = async (userKey: string, store: BookingReminderStore): Promise<void> => {
  await generalStorage.setItem(getStorageKey(userKey), JSON.stringify(store));
};

const clearStore = async (userKey: string): Promise<void> => {
  await generalStorage.removeItem(getStorageKey(userKey));
};

export async function initializeBookingReminders(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return;

  if (didInit) return;
  didInit = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Booking reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error("Failed to set Android notification channel", message);
      if (__DEV__) {
        console.debug("[bookingReminders] channel setup failed", {
          message,
          stack: getErrorStack(error),
        });
      }
    }
  }
}

const ensurePermissions = async (
  Notifications: typeof import("expo-notifications")
): Promise<boolean> => {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Failed to request notification permissions", message);
    if (__DEV__) {
      console.debug("[bookingReminders] permission request failed", {
        message,
        stack: getErrorStack(error),
      });
    }
    return false;
  }
};

const getBookingStartIso = (booking: Booking): string | null => {
  const start = booking.start || booking.startTime;
  if (!start || typeof start !== "string") return null;
  return start;
};

const computeFireDate = (startIso: string, minutesBefore: number): Date | null => {
  const startDate = new Date(startIso);
  if (Number.isNaN(startDate.getTime())) return null;

  const fireAtMs = startDate.getTime() - minutesBefore * 60 * 1000;
  const fireDate = new Date(fireAtMs);
  if (Number.isNaN(fireDate.getTime())) return null;

  // Skip reminders that would fire in the past (or effectively "now")
  if (fireAtMs <= Date.now() + 1000) return null;

  return fireDate;
};

const formatBody = (bookingTitle: string, minutes: number) => {
  if (minutes === 1) {
    return `"${bookingTitle}" starts in 1 minute.`;
  }
  return `"${bookingTitle}" starts in ${minutes} minutes.`;
};

const cancelNotifications = async (
  Notifications: typeof import("expo-notifications"),
  ids: string[]
) => {
  await Promise.all(
    ids.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Silently ignore (notification may already be gone)
        noop();
      }
    })
  );
};

export async function syncBookingReminders(params: {
  userKey: string;
  bookings: Booking[];
}): Promise<void> {
  const { userKey, bookings } = params;

  const Notifications = await getExpoNotifications();
  if (!Notifications) return;

  await initializeBookingReminders();

  const granted = await ensurePermissions(Notifications);
  if (!granted) return;

  const store = await readStore(userKey);
  const existing = store.scheduled;

  const desiredUids = new Set<string>();
  const nextScheduled: Record<string, BookingReminderEntry> = {};
  const notificationIdsToCancel: string[] = [];

  for (const booking of bookings) {
    if (!booking?.uid) continue;
    desiredUids.add(booking.uid);

    const startIso = getBookingStartIso(booking);
    if (!startIso) continue;

    const fireDate = computeFireDate(startIso, BOOKING_REMINDER_MINUTES);
    if (!fireDate) continue;

    const fireAtIso = fireDate.toISOString();
    const existingEntry = existing[booking.uid];

    if (existingEntry?.startTimeIso === startIso && existingEntry.fireAtIso === fireAtIso) {
      nextScheduled[booking.uid] = existingEntry;
      continue;
    }

    if (existingEntry?.notificationId) {
      notificationIdsToCancel.push(existingEntry.notificationId);
    }

    try {
      const trigger: import("expo-notifications").NotificationTriggerInput =
        Platform.OS === "android"
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fireDate,
              channelId: ANDROID_CHANNEL_ID,
            }
          : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Upcoming booking",
          body: formatBody(booking.title || "Your booking", BOOKING_REMINDER_MINUTES),
          data: {
            kind: "booking-reminder",
            bookingUid: booking.uid,
          },
        },
        trigger,
      });

      nextScheduled[booking.uid] = {
        notificationId,
        startTimeIso: startIso,
        fireAtIso,
      };
    } catch (error) {
      const message = getErrorMessage(error);
      console.error("Failed to schedule booking reminder", message);
      if (__DEV__) {
        console.debug("[bookingReminders] schedule failed", {
          message,
          stack: getErrorStack(error),
          bookingUid: booking.uid,
          startIso,
          fireAtIso,
        });
      }
    }
  }

  for (const [uid, entry] of Object.entries(existing)) {
    if (!desiredUids.has(uid) && entry?.notificationId) {
      notificationIdsToCancel.push(entry.notificationId);
    }
  }

  if (notificationIdsToCancel.length > 0) {
    await cancelNotifications(Notifications, notificationIdsToCancel);
  }

  await writeStore(userKey, { version: STORE_VERSION, scheduled: nextScheduled });
}

export async function cancelAllBookingReminders(userKey: string): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    await clearStore(userKey);
    return;
  }

  try {
    await initializeBookingReminders();

    const store = await readStore(userKey);
    const ids = Object.values(store.scheduled)
      .map((entry) => entry.notificationId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (ids.length > 0) {
      await cancelNotifications(Notifications, ids);
    }
  } finally {
    await clearStore(userKey);
  }
}

export async function scheduleTestBookingReminder(): Promise<void> {
  if (Platform.OS === "web") return;

  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    throw new Error(
      "Notifications native module not available. Rebuild the dev client (expo run:android/ios)."
    );
  }

  await initializeBookingReminders();

  const granted = await ensurePermissions(Notifications);
  if (!granted) return;

  const fireDate = new Date(Date.now() + 10_000);

  const trigger: import("expo-notifications").NotificationTriggerInput =
    Platform.OS === "android"
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
          channelId: ANDROID_CHANNEL_ID,
        }
      : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "30 Min Meeting between Dhairyashil Shinde and Monkey D. Luffy",
      body: "Dhairyashil Shinde, Monkey D. Luffy",
      data: {
        kind: "booking-reminder-test",
      },
    },
    trigger,
  });
}
