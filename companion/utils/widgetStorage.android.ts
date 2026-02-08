import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestWidgetUpdate } from "react-native-android-widget";
import { UpcomingBookingsWidget } from "@/widgets/UpcomingBookingsWidget";
import {
  type BookingInput,
  type WidgetData,
  ANDROID_WIDGET_STORAGE_KEY,
  transformBookingsToWidgetData,
} from "./widgetStorage.shared";

async function updateAndroidWidget(widgetData: WidgetData): Promise<void> {
  await AsyncStorage.setItem(ANDROID_WIDGET_STORAGE_KEY, JSON.stringify(widgetData));

  try {
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

export async function updateWidgetBookings(bookings: BookingInput[]): Promise<void> {
  if (__DEV__) {
    console.log("[Widget Debug] updateWidgetBookings called with", bookings.length, "bookings");
  }

  try {
    const widgetData = transformBookingsToWidgetData(bookings);
    await updateAndroidWidget(widgetData);
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
    await updateAndroidWidget(emptyData);
  } catch (error) {
    console.warn("Failed to clear widget bookings:", error);
  }
}

// Re-export shared utilities
export * from "./widgetStorage.shared";
