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

    // Try to get cached bookings from any of the common query keys used in the app
    // The app uses different filter combinations, so we check multiple keys
    const possibleFilters = [
      { status: ["upcoming"], limit: 50 },
      { status: ["upcoming"] },
      { status: ["upcoming", "unconfirmed"] },
      {},
    ];

    let cachedBookings: Booking[] | undefined;
    for (const filters of possibleFilters) {
      const cached = queryClient.getQueryData<Booking[]>(queryKeys.bookings.list(filters));
      if (cached !== undefined && cached.length > 0) {
        cachedBookings = cached;
        break;
      }
    }

    if (cachedBookings !== undefined && cachedBookings.length > 0) {
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
      // No cached data found, fetch from API
      try {
        const bookings = await CalComAPIService.getBookings({
          status: ["upcoming"],
          limit: 10,
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
