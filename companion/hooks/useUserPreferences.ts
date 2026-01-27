import { useCallback, useEffect, useState } from "react";
import { generalStorage } from "@/utils/storage";

export type LandingPage = "event-types" | "bookings" | "bookings:unconfirmed";

export interface UserPreferences {
  landingPage: LandingPage;
}

export const USER_PREFERENCES_KEY = "cal_user_preferences";

const DEFAULT_PREFERENCES: UserPreferences = {
  landingPage: "event-types",
};

export interface LandingPageOption {
  value: LandingPage;
  label: string;
}

export const LANDING_PAGE_OPTIONS: LandingPageOption[] = [
  { value: "event-types", label: "Event Types" },
  { value: "bookings", label: "Bookings" },
  { value: "bookings:unconfirmed", label: "Bookings (Unconfirmed)" },
];

export function getLandingPageLabel(landingPage: LandingPage): string {
  const option = LANDING_PAGE_OPTIONS.find((opt) => opt.value === landingPage);
  return option?.label ?? "Event Types";
}

export function getRouteFromPreference(landingPage: LandingPage): string {
  switch (landingPage) {
    case "event-types":
      return "/(tabs)/(event-types)";
    case "bookings":
      return "/(tabs)/(bookings)";
    case "bookings:unconfirmed":
      return "/(tabs)/(bookings)?filter=unconfirmed";
    default:
      return "/(tabs)/(event-types)";
  }
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await generalStorage.getItem(USER_PREFERENCES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as UserPreferences;
          setPreferences(parsed);
        }
        setIsLoading(false);
      } catch {
        console.warn("Failed to load user preferences");
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const setLandingPage = useCallback(
    async (landingPage: LandingPage): Promise<void> => {
      const newPreferences: UserPreferences = {
        ...preferences,
        landingPage,
      };

      setPreferences(newPreferences);

      try {
        await generalStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(newPreferences));
      } catch (error) {
        console.error("Failed to save user preferences:", error);
        throw error;
      }
    },
    [preferences]
  );

  return {
    preferences,
    isLoading,
    setLandingPage,
    landingPageLabel: getLandingPageLabel(preferences.landingPage),
  };
}
