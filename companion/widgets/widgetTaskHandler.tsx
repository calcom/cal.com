"use no memo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { UpcomingBookingsWidget } from "./UpcomingBookingsWidget";

const WIDGET_STORAGE_KEY = "android_widget_bookings";

interface BookingData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  startTimeISO?: string;
  attendeeName: string | null;
  hostName?: string | null;
  location?: string | null;
  hasVideoCall?: boolean;
}

async function getStoredBookings(): Promise<BookingData[]> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.bookings || [];
    }
  } catch (error) {
    console.warn("Failed to get stored bookings for widget:", error);
  }
  return [];
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const bookings = await getStoredBookings();
      props.renderWidget(<UpcomingBookingsWidget bookings={bookings} />);
      break;
    }

    case "WIDGET_CLICK": {
      break;
    }

    case "WIDGET_DELETED": {
      break;
    }

    default:
      break;
  }
}
