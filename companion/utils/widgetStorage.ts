import { Platform, AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExtensionStorage } from "@bacons/apple-targets";

const APP_GROUP_IDENTIFIER = "group.com.cal.companion";
const WIDGET_BOOKINGS_KEY = "widgetBookings";
const ANDROID_WIDGET_STORAGE_KEY = "android_widget_bookings";

// Create ExtensionStorage instance for iOS App Groups
const iosStorage = new ExtensionStorage(APP_GROUP_IDENTIFIER);

export interface WidgetBookingData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  startTimeISO: string; // For countdown calculation
  attendeeName: string | null;
  hostName: string | null;
  location: string | null;
  hasVideoCall: boolean;
}

export interface WidgetData {
  bookings: WidgetBookingData[];
  lastUpdated: string | null;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function updateIOSWidget(widgetData: WidgetData): Promise<void> {
  // Use ExtensionStorage from @bacons/apple-targets to store data in App Groups
  // ExtensionStorage.set() handles JSON serialization internally, so we pass the object directly
  // biome-ignore lint/suspicious/noExplicitAny: ExtensionStorage.set() expects any for the value parameter
  iosStorage.set(WIDGET_BOOKINGS_KEY, widgetData as any);
  console.log("[Widget Debug] Data written to ExtensionStorage with key:", WIDGET_BOOKINGS_KEY);

  // Trigger widget refresh so it picks up the new data
  ExtensionStorage.reloadWidget();
  console.log("[Widget Debug] ExtensionStorage.reloadWidget() called");
}

async function updateAndroidWidget(widgetData: WidgetData): Promise<void> {
  await AsyncStorage.setItem(ANDROID_WIDGET_STORAGE_KEY, JSON.stringify(widgetData));

  try {
    const { requestWidgetUpdate } = await import("react-native-android-widget");
    const { UpcomingBookingsWidget } = await import("@/widgets/UpcomingBookingsWidget");
    await requestWidgetUpdate({
      widgetName: "UpcomingBookingsWidget",
      renderWidget: () => UpcomingBookingsWidget({ bookings: widgetData.bookings }),
      widgetNotFound: () => {
        console.warn("Widget not found on home screen");
      },
    });
  } catch (error) {
    console.warn("Failed to request Android widget update:", error);
  }
}

export async function updateWidgetBookings(
  bookings: Array<{
    id: number;
    uid: string;
    title: string;
    startTime?: string;
    endTime?: string;
    start?: string;
    end?: string;
    attendees?: Array<{ name: string; email: string }>;
    hosts?: Array<{ name?: string; email?: string }>;
    user?: { name?: string; email?: string };
    location?: string;
  }>
): Promise<void> {
  console.log("[Widget Debug] updateWidgetBookings called with", bookings.length, "bookings");

  try {
    const widgetBookings: WidgetBookingData[] = bookings.slice(0, 5).map((booking) => {
      // Handle both property name formats (startTime/endTime vs start/end)
      const startTimeStr = booking.startTime || booking.start || "";
      const endTimeStr = booking.endTime || booking.end || "";

      // Get host name from hosts array or user object
      const hostName = booking.hosts?.[0]?.name || booking.user?.name || null;

      // Check if meeting has a video call link
      const locationLower = (booking.location || "").toLowerCase();
      const hasVideoCall =
        locationLower.includes("zoom") ||
        locationLower.includes("meet") ||
        locationLower.includes("teams") ||
        locationLower.includes("webex") ||
        locationLower.includes("cal video");

      return {
        id: booking.uid || String(booking.id),
        title: booking.title,
        date: formatDate(startTimeStr),
        startTime: formatTime(startTimeStr),
        endTime: formatTime(endTimeStr),
        startTimeISO: startTimeStr, // Pass ISO string for countdown calculation
        attendeeName: booking.attendees?.[0]?.name || null,
        hostName: hostName,
        location: booking.location || null,
        hasVideoCall: hasVideoCall,
      };
    });

    const widgetData: WidgetData = {
      bookings: widgetBookings,
      lastUpdated: new Date().toISOString(),
    };

    if (Platform.OS === "ios") {
      console.log("[Widget Debug] Platform is iOS, calling updateIOSWidget");
      await updateIOSWidget(widgetData);
    } else if (Platform.OS === "android") {
      await updateAndroidWidget(widgetData);
    }
  } catch (error) {
    console.warn("Failed to update widget bookings:", error);
  }
}

export async function clearWidgetBookings(): Promise<void> {
  try {
    const emptyData: WidgetData = {
      bookings: [],
      lastUpdated: new Date().toISOString(),
    };

    if (Platform.OS === "ios") {
      await updateIOSWidget(emptyData);
    } else if (Platform.OS === "android") {
      await updateAndroidWidget(emptyData);
    }
  } catch (error) {
    console.warn("Failed to clear widget bookings:", error);
  }
}

export function setupWidgetRefreshOnAppStateChange(
  fetchAndUpdateBookings: () => Promise<void>
): () => void {
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "background" || nextAppState === "inactive") {
      fetchAndUpdateBookings().catch((error) => {
        console.warn("Failed to refresh widget on app state change:", error);
      });
    }
  };

  const subscription = AppState.addEventListener("change", handleAppStateChange);

  return () => {
    subscription.remove();
  };
}
