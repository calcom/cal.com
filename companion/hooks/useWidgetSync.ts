import { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/config/cache.config";
import { CalComAPIService, type Booking } from "@/services/calcom";
import {
  updateWidgetBookings,
  clearWidgetBookings,
  setupWidgetRefreshOnAppStateChange,
} from "@/utils/widgetStorage";

export function useWidgetSync() {
  const queryClient = useQueryClient();

  const syncBookingsToWidget = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }

    try {
      const cachedBookings = queryClient.getQueryData<Booking[]>(
        queryKeys.bookings.list({ status: ["upcoming", "unconfirmed"] })
      );

      if (cachedBookings && cachedBookings.length > 0) {
        const upcomingBookings = cachedBookings
          .filter((booking) => {
            const startTime = new Date(booking.startTime);
            return startTime > new Date();
          })
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        await updateWidgetBookings(upcomingBookings);
      } else {
        const bookings = await CalComAPIService.getBookings({
          status: ["upcoming", "unconfirmed"],
          limit: 5,
        });

        const upcomingBookings = bookings
          .filter((booking) => {
            const startTime = new Date(booking.startTime);
            return startTime > new Date();
          })
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        await updateWidgetBookings(upcomingBookings);
      }
    } catch (error) {
      console.warn("Failed to sync bookings to widget:", error);
    }
  }, [queryClient]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    syncBookingsToWidget();

    const cleanup = setupWidgetRefreshOnAppStateChange(syncBookingsToWidget);

    return cleanup;
  }, [syncBookingsToWidget]);

  return {
    syncBookingsToWidget,
    clearWidgetBookings,
  };
}
