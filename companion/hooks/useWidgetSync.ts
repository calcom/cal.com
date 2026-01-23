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

    // Get cached bookings outside of try/catch to avoid React Compiler limitation
    const cachedBookings = queryClient.getQueryData<Booking[]>(
      queryKeys.bookings.list({ status: ["upcoming", "unconfirmed"] })
    );
    const hasCachedBookings = cachedBookings !== undefined && cachedBookings.length > 0;

    if (hasCachedBookings) {
      try {
        const upcomingBookings = cachedBookings
          .filter((booking) => {
            const startTime = new Date(booking.startTime);
            return startTime > new Date();
          })
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        await updateWidgetBookings(upcomingBookings);
      } catch (error) {
        console.warn("Failed to sync cached bookings to widget:", error);
      }
    } else {
      try {
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
      } catch (error) {
        console.warn("Failed to fetch and sync bookings to widget:", error);
      }
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
