import { ExtensionStorage } from "@bacons/apple-targets";
import {
  type BookingInput,
  type WidgetData,
  APP_GROUP_IDENTIFIER,
  WIDGET_BOOKINGS_KEY,
  transformBookingsToWidgetData,
} from "./widgetStorage.shared";

const iosStorage = new ExtensionStorage(APP_GROUP_IDENTIFIER);

async function updateIOSWidget(widgetData: WidgetData): Promise<void> {
  // biome-ignore lint/suspicious/noExplicitAny: ExtensionStorage.set() expects any for the value parameter
  iosStorage.set(WIDGET_BOOKINGS_KEY, widgetData as any);
  if (__DEV__) {
    console.log("[Widget Debug] Data written to ExtensionStorage with key:", WIDGET_BOOKINGS_KEY);
  }

  ExtensionStorage.reloadWidget();
  if (__DEV__) {
    console.log("[Widget Debug] ExtensionStorage.reloadWidget() called");
  }
}

export async function updateWidgetBookings(bookings: BookingInput[]): Promise<void> {
  if (__DEV__) {
    console.log("[Widget Debug] updateWidgetBookings called with", bookings.length, "bookings");
  }

  try {
    const widgetData = transformBookingsToWidgetData(bookings);
    if (__DEV__) {
      console.log("[Widget Debug] Platform is iOS, calling updateIOSWidget");
    }
    await updateIOSWidget(widgetData);
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
    await updateIOSWidget(emptyData);
  } catch (error) {
    console.warn("Failed to clear widget bookings:", error);
  }
}

// Re-export shared utilities
export * from "./widgetStorage.shared";
