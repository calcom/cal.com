import { AppState, type AppStateStatus } from "react-native";

export const APP_GROUP_IDENTIFIER = "group.com.cal.companion";
export const WIDGET_BOOKINGS_KEY = "widgetBookings";
export const ANDROID_WIDGET_STORAGE_KEY = "android_widget_bookings";

export interface WidgetBookingData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  startTimeISO: string;
  attendeeName: string | null;
  hostName: string | null;
  location: string | null;
  hasVideoCall: boolean;
}

export interface WidgetData {
  bookings: WidgetBookingData[];
  lastUpdated: string | null;
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export interface BookingInput {
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
}

export function transformBookingsToWidgetData(bookings: BookingInput[]): WidgetData {
  const widgetBookings: WidgetBookingData[] = bookings.slice(0, 5).map((booking) => {
    const startTimeStr = booking.startTime || booking.start || "";
    const endTimeStr = booking.endTime || booking.end || "";
    const hostName = booking.hosts?.[0]?.name || booking.user?.name || null;
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
      startTimeISO: startTimeStr,
      attendeeName: booking.attendees?.[0]?.name || null,
      hostName: hostName,
      location: booking.location || null,
      hasVideoCall: hasVideoCall,
    };
  });

  return {
    bookings: widgetBookings,
    lastUpdated: new Date().toISOString(),
  };
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
