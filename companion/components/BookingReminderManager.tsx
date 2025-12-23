import React, { useEffect, useMemo, useRef } from "react";
import { useRouter } from "expo-router";

import { useAuth } from "../contexts/AuthContext";
import { useBookings } from "../hooks/useBookings";
import {
  getBookingRemindersUserKey,
  initializeBookingReminders,
  syncBookingReminders,
} from "../services/bookingReminders";
import { getExpoNotifications } from "../services/expoNotifications";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const getErrorStack = (error: unknown) => (error instanceof Error ? error.stack : undefined);

type NotificationKind = "booking-reminder" | "booking-reminder-test";

const extractNotificationInfo = (
  data: unknown
): { kind: NotificationKind; bookingUid?: string } | null => {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  const kind = record.kind;
  if (kind !== "booking-reminder" && kind !== "booking-reminder-test") return null;

  if (kind === "booking-reminder-test") {
    return { kind };
  }

  const uid = record.bookingUid;
  return typeof uid === "string" && uid.length > 0 ? { kind, bookingUid: uid } : null;
};

export function BookingReminderManager() {
  const router = useRouter();
  const { userInfo } = useAuth();

  const userKey = useMemo(() => getBookingRemindersUserKey(userInfo), [userInfo]);

  const bookingsQuery = useBookings({ status: ["upcoming"], limit: 50 });

  const lastHandledNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    void initializeBookingReminders();
  }, []);

  useEffect(() => {
    if (!userKey) return;
    if (!bookingsQuery.isSuccess) return;

    void syncBookingReminders({ userKey, bookings: bookingsQuery.data ?? [] });
  }, [bookingsQuery.data, bookingsQuery.isSuccess, userKey]);

  useEffect(() => {
    let isActive = true;
    let removeListener: (() => void) | null = null;

    const setup = async () => {
      const Notifications = await getExpoNotifications();
      if (!Notifications || !isActive) return;

      const handleResponse = (
        response: import("expo-notifications").NotificationResponse | null
      ) => {
        const notificationId = response?.notification?.request?.identifier;
        if (notificationId && lastHandledNotificationIdRef.current === notificationId) return;

        const info = extractNotificationInfo(response?.notification?.request?.content?.data);
        if (!info) return;

        if (notificationId) {
          lastHandledNotificationIdRef.current = notificationId;
        }

        if (info.kind === "booking-reminder-test") {
          router.push("/(tabs)/(bookings)");
          return;
        }

        router.push({ pathname: "/booking-detail", params: { uid: info.bookingUid } });
      };

      const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
      removeListener = () => subscription.remove();

      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        handleResponse(last);
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to read last notification response", message);
        if (__DEV__) {
          console.debug("[BookingReminderManager] getLastNotificationResponseAsync failed", {
            message,
            stack: getErrorStack(error),
          });
        }
      }
    };

    void setup();

    return () => {
      isActive = false;
      removeListener?.();
    };
  }, [router]);

  return null;
}
