import { useState, useEffect, useCallback } from "react";
import type { PermissionState } from "web-notifications";

import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";

const NOTIFY_AGAIN_AFTER = 1000 * 60 * 60;

export const useNotifications = () => {
  const [currentNotificationPermission, setCurrentNotificationPermission] =
    useState<PermissionState>("granted");

  useEffect(() => {
    if ("Notification" in window) {
      setCurrentNotificationPermission(Notification.permission);
    } else {
      setCurrentNotificationPermission("default");
    }
  }, []);

  const notify = useCallback(
    ({
      title,
      body,
      href,
      notificationId,
    }: {
      title: string;
      body: string;
      href: string;
      notificationId: string;
    }) => {
      if (currentNotificationPermission === "granted" && shouldNotify(notificationId)) {
        const notification = new Notification(title, {
          icon: "/cal-com-icon.svg",
          body,
          tag: notificationId,
        });

        storeEventNotification(notificationId);

        notification.onclick = () => {
          window.open(href);
        };
      }
    },
    [currentNotificationPermission]
  );

  const { data: unConfirmedBookings } = trpc.viewer.bookings.getUnconfirmedBookings.useQuery();

  if (unConfirmedBookings) {
    console.log(currentNotificationPermission);
    for (const booking of unConfirmedBookings) {
      notify({
        title: "Unconfirmed Booking",
        body: booking.title,
        href: "/bookings/unconfirmed",
        notificationId: booking.id,
      });
    }
  }

  const requestNotificationsPermission = async () => {
    if ("Notification" in window) {
      const permissionResponse = await Notification.requestPermission();
      setCurrentNotificationPermission(permissionResponse);

      if (permissionResponse === "granted") {
        showToast("Notifications turned on", "success");
      } else if (permissionResponse === "denied") {
        showToast("You denied the notifications", "warning");
      } else {
        showToast("Please allow the notifications from prompt window", "warning");
      }
    } else {
      showToast("Your browser does not support Notifications. Please update your browser.", "error");
    }
  };

  return {
    currentNotificationPermission,
    requestNotificationsPermission,
  };
};

const NOTIFICATION_DATA_KEY = "notifications_data";

// Helper function to get the stored notification data from localStorage
function getStoredNotificationData(): EventNotificationData {
  const storedData = localStorage.getItem(NOTIFICATION_DATA_KEY);
  return storedData ? JSON.parse(storedData) : {};
}

// Helper function to store the notification data in localStorage
function storeNotificationData(data: EventNotificationData) {
  localStorage.setItem(NOTIFICATION_DATA_KEY, JSON.stringify(data));
}

// Function to store the notification ID and last notification time
function storeEventNotification(notificationId: string) {
  const currentTime = Date.now();
  const storedData = getStoredNotificationData();
  storedData[notificationId] = currentTime;
  storeNotificationData(storedData);
}

// Function to check if it's time to notify the user again for a particular event
function shouldNotify(notificationId: string) {
  const storedData = getStoredNotificationData();
  const lastNotifiedTimestamp = storedData[notificationId] || 0;
  const currentTime = Date.now();
  return currentTime - lastNotifiedTimestamp >= NOTIFY_AGAIN_AFTER;
}
