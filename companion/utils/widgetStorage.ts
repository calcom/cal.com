// This file serves as the base implementation for platforms without specific extensions.
// Metro bundler will prefer widgetStorage.ios.ts or widgetStorage.android.ts when available.

import type { BookingInput } from "./widgetStorage.shared";

// Re-export shared types and utilities for consumers
export {
  type WidgetBookingData,
  type WidgetData,
  type BookingInput,
  setupWidgetRefreshOnAppStateChange,
  formatTime,
  formatDate,
  transformBookingsToWidgetData,
  APP_GROUP_IDENTIFIER,
  WIDGET_BOOKINGS_KEY,
  ANDROID_WIDGET_STORAGE_KEY,
} from "./widgetStorage.shared";

export async function updateWidgetBookings(_bookings: BookingInput[]): Promise<void> {
  console.warn("Widget updates are not supported on this platform");
}

export async function clearWidgetBookings(): Promise<void> {
  console.warn("Widget clearing is not supported on this platform");
}
