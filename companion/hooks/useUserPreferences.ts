import { useCallback, useEffect, useState } from "react";
import { generalStorage } from "@/utils/storage";

export type LandingPage =
  | "event-types"
  | "bookings"
  | "bookings:upcoming"
  | "bookings:unconfirmed"
  | "bookings:recurring"
  | "bookings:past"
  | "bookings:cancelled";

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
  { value: "bookings:upcoming", label: "Bookings (Upcoming)" },
  { value: "bookings:unconfirmed", label: "Bookings (Unconfirmed)" },
  { value: "bookings:recurring", label: "Bookings (Recurring)" },
  { value: "bookings:past", label: "Bookings (Past)" },
  { value: "bookings:cancelled", label: "Bookings (Cancelled)" },
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
    case "bookings:upcoming":
      return "/(tabs)/(bookings)?filter=upcoming";
    case "bookings:unconfirmed":
      return "/(tabs)/(bookings)?filter=unconfirmed";
    case "bookings:recurring":
      return "/(tabs)/(bookings)?filter=recurring";
    case "bookings:past":
      return "/(tabs)/(bookings)?filter=past";
    case "bookings:cancelled":
      return "/(tabs)/(bookings)?filter=cancelled";
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
      } catch (error) {
        console.warn("Failed to load user preferences:", error);
      } finally {
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
