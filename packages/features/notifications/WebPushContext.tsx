"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

interface WebPushContextProps {
  permission: NotificationPermission;
  isLoading: boolean;
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const WebPushContext = createContext<WebPushContextProps | null>(null);

interface ProviderProps {
  children: React.ReactNode;
}

export function WebPushProvider({ children }: ProviderProps) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );
  const [pushManager, setPushManager] = useState<PushManager | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const { mutate: addSubscription } =
    trpc.viewer.loggedInViewerRouter.addNotificationsSubscription.useMutation();
  const { mutate: removeSubscription } =
    trpc.viewer.loggedInViewerRouter.removeNotificationsSubscription.useMutation();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/service-worker.js")
      .then(async (registration) => {
        if ("pushManager" in registration) {
          setPushManager(registration.pushManager);
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  }, []);

  const contextValue = useMemo(
    () => ({
      permission,
      isLoading,
      isSubscribed,
      subscribe: async () => {
        try {
          setIsLoading(true);
          const newPermission = await Notification.requestPermission();
          setPermission(newPermission);

          if (newPermission === "granted" && pushManager) {
            const subscription = await pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
            });
            addSubscription({ subscription: JSON.stringify(subscription) });
            setIsSubscribed(true);
            showToast("Notifications enabled successfully", "success");
          }
        } catch (error) {
          console.error("Failed to subscribe:", error);
          if (
            error instanceof DOMException &&
            error.name === "InvalidAccessError" &&
            error.message.includes("applicationServerKey")
          ) {
            showToast("Please enable Google services for push messaging and try again", "error");
          } else {
            showToast("Failed to enable notifications", "error");
          }
        } finally {
          setIsLoading(false);
        }
      },
      unsubscribe: async () => {
        if (!pushManager) return;
        try {
          setIsLoading(true);
          const subscription = await pushManager.getSubscription();
          if (subscription) {
            const subscriptionJson = JSON.stringify(subscription);
            await subscription.unsubscribe();
            removeSubscription({ subscription: subscriptionJson });
            setIsSubscribed(false);
            showToast("Notifications disabled successfully", "success");
          }
        } catch (error) {
          console.error("Failed to unsubscribe:", error);
          showToast("Failed to disable notifications", "error");
        } finally {
          setIsLoading(false);
        }
      },
    }),
    [permission, isLoading, isSubscribed, pushManager, addSubscription, removeSubscription]
  );

  return <WebPushContext.Provider value={contextValue}>{children}</WebPushContext.Provider>;
}

export function useWebPush() {
  const context = useContext(WebPushContext);
  if (!context) {
    throw new Error("useWebPush must be used within a WebPushProvider");
  }
  return context;
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
