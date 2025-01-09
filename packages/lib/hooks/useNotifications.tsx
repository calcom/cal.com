import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";

export enum ButtonState {
  NONE = "none",
  ALLOW = "allow",
  DISABLE = "disable",
  DENIED = "denied",
}

export function useNotifications() {
  const [buttonToShow, setButtonToShow] = useState<ButtonState>(ButtonState.NONE);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();

  const { mutate: addSubscription } = trpc.viewer.addNotificationsSubscription.useMutation({
    onSuccess: () => {
      setButtonToShow(ButtonState.DISABLE);
      showToast(t("browser_notifications_turned_on"), "success");
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, "error");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });
  const { mutate: removeSubscription } = trpc.viewer.removeNotificationsSubscription.useMutation({
    onSuccess: () => {
      setButtonToShow(ButtonState.ALLOW);
      showToast(t("browser_notifications_turned_off"), "success");
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, "error");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  useEffect(() => {
    const checkPermissions = async () => {
      if (!("Notification" in window)) {
        console.log("Notifications not supported");
        return;
      }

      const registration = await navigator.serviceWorker?.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      const notificationPermission = Notification.permission;

      if (notificationPermission === ButtonState.DENIED) {
        setButtonToShow(ButtonState.DENIED);
        return;
      }

      if (notificationPermission === "default") {
        setButtonToShow(ButtonState.ALLOW);
        return;
      }

      if (!subscription) {
        setButtonToShow(ButtonState.ALLOW);
        return;
      }

      setButtonToShow(ButtonState.DISABLE);
    };

    checkPermissions();
  }, []);

  const enableNotifications = async () => {
    setIsLoading(true);

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      console.error("VAPID public key is missing");
      setIsLoading(false);
      showToast(t("browser_notifications_configuration_error"), "error");
      return;
    }

    const permissionResponse = await Notification.requestPermission();

    if (permissionResponse === ButtonState.DENIED) {
      setButtonToShow(ButtonState.DENIED);
      setIsLoading(false);
      showToast(t("browser_notifications_denied"), "warning");
      return;
    }

    if (permissionResponse === "default") {
      setIsLoading(false);
      showToast(t("please_allow_notifications"), "warning");
      return;
    }

    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration) {
      console.error("Service worker registration not found");
      setIsLoading(false);
      showToast(t("browser_notifications_not_supported"), "error");
      return;
    }

    let subscription: PushSubscription;
    try {
      const vapidKey = urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      addSubscription(
        { subscription: JSON.stringify(subscription) },
        {
          onError: async (error) => {
            console.error("Subscription error:", error);
            await subscription.unsubscribe();
          },
        }
      );
    } catch (error) {
      console.error("Push subscription error:", error);
      setIsLoading(false);
      setButtonToShow(ButtonState.NONE);
      showToast(t("browser_notifications_not_supported"), "error");
      return;
    }
  };

  const disableNotifications = async () => {
    setIsLoading(true);
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration) {
      // This will not happen ideally as the button will not be shown if the service worker is not registered
      return;
    }
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // This will not happen ideally as the button will not be shown if the subscription is not present
      return;
    }
    removeSubscription(
      { subscription: JSON.stringify(subscription) },
      {
        onSuccess: async () => {
          await subscription.unsubscribe();
        },
      }
    );
  };

  return {
    buttonToShow,
    isLoading,
    enableNotifications,
    disableNotifications,
  };
}

const urlB64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
