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
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
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

      if (notificationPermission === "granted" && subscription) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          await audioContext.resume();
          setHasAudioPermission(true);
        } catch (error) {
          console.error("Could not initialize audio context:", error);
          setHasAudioPermission(false);
        }
      }

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

  const requestAudioPermission = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContext.resume();

      // Create and play a silent buffer to initialize audio context
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      setHasAudioPermission(true);
      return true;
    } catch (error) {
      console.error("Could not get audio permission:", error);
      setHasAudioPermission(false);
      return false;
    }
  };

  const enableNotifications = async () => {
    setIsLoading(true);

    // Request notification permission
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

    // Request audio permission if notifications were granted
    if (permissionResponse === "granted") {
      await requestAudioPermission();
    }

    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration) return;

    let subscription: PushSubscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
      });
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setButtonToShow(ButtonState.NONE);
      showToast(t("browser_notifications_not_supported"), "error");
      return;
    }

    addSubscription(
      { subscription: JSON.stringify(subscription) },
      {
        onError: async () => {
          await subscription.unsubscribe();
        },
      }
    );
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
    hasAudioPermission,
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
