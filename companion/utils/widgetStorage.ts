import { Platform, AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SharedGroupPreferences from "react-native-shared-group-preferences";

const APP_GROUP_IDENTIFIER = "group.com.cal.companion";
const WIDGET_BOOKINGS_KEY = "widgetBookings";
const ANDROID_WIDGET_STORAGE_KEY = "android_widget_bookings";

export interface WidgetBookingData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeName: string | null;
  location: string | null;
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

async function updateIOSWidget(widgetData: WidgetData): Promise<void> {
  await SharedGroupPreferences.setItem(WIDGET_BOOKINGS_KEY, widgetData, APP_GROUP_IDENTIFIER);
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
    startTime: string;
    endTime: string;
    attendees?: Array<{ name: string; email: string }>;
    location?: string;
  }>
): Promise<void> {
  try {
    const widgetBookings: WidgetBookingData[] = bookings.slice(0, 5).map((booking) => ({
      id: booking.uid || String(booking.id),
      title: booking.title,
      startTime: formatTime(booking.startTime),
      endTime: formatTime(booking.endTime),
      attendeeName: booking.attendees?.[0]?.name || null,
      location: booking.location || null,
    }));

    const widgetData: WidgetData = {
      bookings: widgetBookings,
      lastUpdated: new Date().toISOString(),
    };

    if (Platform.OS === "ios") {
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
