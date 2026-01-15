import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { generalStorage } from "@/utils/storage";

const PUSH_ONBOARDING_COMPLETED_KEY = "cal_push_onboarding_completed";
const PUSH_TOKEN_KEY = "cal_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface PushNotificationContextType {
  expoPushToken: string | null;
  hasCompletedOnboarding: boolean;
  permissionStatus: Notifications.PermissionStatus | null;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  registerForPushNotifications: () => Promise<string | null>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

interface PushNotificationProviderProps {
  children: ReactNode;
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const completed = await generalStorage.getItem(PUSH_ONBOARDING_COMPLETED_KEY);
      setHasCompletedOnboarding(completed === "true");

      const storedToken = await generalStorage.getItem(PUSH_TOKEN_KEY);
      if (storedToken) {
        setExpoPushToken(storedToken);
      }

      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to check push notification onboarding status:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);
      return finalStatus === "granted";
    } catch (error) {
      console.error("Failed to request push notification permission:", error);
      return false;
    }
  }, []);

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === "web") {
      return null;
    }

    if (!Device.isDevice) {
      console.warn("Push notifications require a physical device");
      return null;
    }

    try {
      const granted = await requestPermission();
      if (!granted) {
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#000000",
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "f5e97f6f-1e95-44ac-bfa4-f737ef90f198",
      });
      const token = tokenData.data;

      setExpoPushToken(token);
      await generalStorage.setItem(PUSH_TOKEN_KEY, token);

      return token;
    } catch (error) {
      console.error("Failed to register for push notifications:", error);
      return null;
    }
  }, [requestPermission]);

  const completeOnboarding = useCallback(async () => {
    try {
      await registerForPushNotifications();
      await generalStorage.setItem(PUSH_ONBOARDING_COMPLETED_KEY, "true");
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Failed to complete push notification onboarding:", error);
    }
  }, [registerForPushNotifications]);

  const skipOnboarding = useCallback(async () => {
    try {
      await generalStorage.setItem(PUSH_ONBOARDING_COMPLETED_KEY, "true");
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Failed to skip push notification onboarding:", error);
    }
  }, []);

  const value: PushNotificationContextType = {
    expoPushToken,
    hasCompletedOnboarding,
    permissionStatus,
    isLoading,
    requestPermission,
    completeOnboarding,
    skipOnboarding,
    registerForPushNotifications,
  };

  return (
    <PushNotificationContext.Provider value={value}>{children}</PushNotificationContext.Provider>
  );
}

export function usePushNotifications(): PushNotificationContextType {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error("usePushNotifications must be used within a PushNotificationProvider");
  }
  return context;
}
