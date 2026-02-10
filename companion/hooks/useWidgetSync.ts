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
    if (__DEV__) {
      console.log("[Widget Debug] syncBookingsToWidget called, Platform:", Platform.OS);
    }

    if (Platform.OS === "web") {
      if (__DEV__) {
        console.log("[Widget Debug] Skipping - web platform");
      }
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
      if (__DEV__) {
        console.log(
          "[Widget Debug] Checking cache for filters:",
          JSON.stringify(filters),
          "found:",
          cached?.length ?? 0
        );
      }
      if (cached !== undefined && cached.length > 0) {
        cachedBookings = cached;
        break;
      }
    }

    if (cachedBookings !== undefined && cachedBookings.length > 0) {
      if (__DEV__) {
        console.log("[Widget Debug] Using cached bookings, count:", cachedBookings.length);
        console.log("[Widget Debug] Current time (UTC):", new Date().toISOString());
      }

      // Log each booking's times for debugging - check both property name formats
      if (__DEV__) {
        cachedBookings.slice(0, 3).forEach((booking, i) => {
          console.log(
            `[Widget Debug] Booking ${i}: startTime=${booking.startTime}, start=${booking.start}, endTime=${booking.endTime}, end=${booking.end}`
          );
        });
      }

      try {
        // Filter bookings that haven't ended yet (includes ongoing meetings)
        // Sort by start time to show soonest first
        // Note: API may return either start/end or startTime/endTime
        const upcomingBookings = cachedBookings
          .filter((booking) => {
            const endTimeStr = booking.endTime || booking.end;
            if (!endTimeStr) {
              if (__DEV__) {
                console.log(`[Widget Debug] Booking ${booking.id}: No end time found, skipping`);
              }
              return false;
            }
            const endTime = new Date(endTimeStr);
            const isUpcoming = endTime > new Date();
            if (__DEV__) {
              console.log(
                `[Widget Debug] Booking ${booking.id}: endTime=${endTime.toISOString()}, isUpcoming=${isUpcoming}`
              );
            }
            return isUpcoming;
          })
          .sort((a, b) => {
            const aStart = new Date(a.startTime || a.start || "").getTime();
            const bStart = new Date(b.startTime || b.start || "").getTime();
            return aStart - bStart;
          });

        if (__DEV__) {
          console.log("[Widget Debug] Filtered upcoming bookings, count:", upcomingBookings.length);
        }
        await updateWidgetBookings(upcomingBookings);
      } catch (error) {
        console.warn("Failed to sync cached bookings to widget:", error);
      }
    } else {
      // No cached data found, fetch from API
      if (__DEV__) {
        console.log("[Widget Debug] No cached data, fetching from API...");
      }
      try {
        const bookings = await CalComAPIService.getBookings({
          status: ["upcoming"],
          limit: 10,
        });

        if (__DEV__) {
          console.log("[Widget Debug] API returned bookings, count:", bookings.length);
        }

        // Filter bookings that haven't ended yet (includes ongoing meetings)
        const upcomingBookings = bookings
          .filter((booking) => {
            const endTime = new Date(booking.endTime);
            return endTime > new Date();
          })
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (__DEV__) {
          console.log(
            "[Widget Debug] Filtered upcoming bookings from API, count:",
            upcomingBookings.length
          );
        }
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
