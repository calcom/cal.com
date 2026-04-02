import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useMemo } from "react";
import type {
  BookingListingStatus,
  BookingOutput,
  BookingRowData,
  BookingsGetOutput,
  RowData,
} from "../types";

/**
 * Transform raw bookings into final data structure with separators
 * - Deduplicates recurring bookings for recurring/unconfirmed/cancelled tabs
 * - For "upcoming" status, organizes into "Today" and "Next" sections
 */
export function useBookingListData({
  data,
  status,
  userTimeZone,
}: {
  data?: BookingsGetOutput;
  status: BookingListingStatus;
  userTimeZone?: string;
}) {
  const { t } = useLocale();

  // Build a Map for recurringInfo lookups
  const recurringInfoMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["recurringInfo"][number]>();
    for (const info of data?.recurringInfo ?? []) {
      if (info.recurringEventId) {
        map.set(info.recurringEventId, info);
      }
    }
    return map;
  }, [data?.recurringInfo]);

  /**
   * Transform raw bookings into flat list (excluding today's bookings for "upcoming" status)
   * - Deduplicates recurring bookings for recurring/unconfirmed/cancelled tabs
   * - For "upcoming" status, filters out today's bookings (they're shown in separate "Today" section)
   */
  const flatData = useMemo<BookingRowData[]>(() => {
    const todayDateString = dayjs().tz(userTimeZone).format("YYYY-MM-DD");

    // For recurring/unconfirmed/cancelled tabs: track recurring series to show only one representative booking per series
    // Key: recurringEventId, Value: array of all bookings in that series
    const shownBookings: Record<string, BookingOutput[]> = {};

    const filterBookings = (booking: BookingOutput) => {
      // Deduplicate recurring bookings for specific status tabs
      // This ensures we show only ONE booking per recurring series instead of all occurrences
      if (status === "recurring" || status == "unconfirmed" || status === "cancelled") {
        // Non-recurring bookings are always shown
        if (!booking.recurringEventId) {
          return true;
        }

        // If we've already encountered this recurring series
        if (
          shownBookings[booking.recurringEventId] !== undefined &&
          shownBookings[booking.recurringEventId].length > 0
        ) {
          // Store this occurrence but DON'T display it (return false to filter out)
          shownBookings[booking.recurringEventId].push(booking);
          return false;
        }

        // First occurrence of this recurring series - show it and start tracking
        shownBookings[booking.recurringEventId] = [booking];
      } else if (status === "upcoming") {
        // For "upcoming" tab, exclude today's bookings (they're shown separately in the "Today" section)
        return dayjs(booking.startTime).tz(userTimeZone).format("YYYY-MM-DD") !== todayDateString;
      }
      return true;
    };

    return (
      data?.bookings.filter(filterBookings).map((booking) => ({
        type: "data" as const,
        booking,
        recurringInfo: booking.recurringEventId ? recurringInfoMap.get(booking.recurringEventId) : undefined,
        isToday: false,
      })) || []
    );
  }, [data?.bookings, recurringInfoMap, status, userTimeZone]);

  // Extract today's bookings for the "Today" section (only used in "upcoming" status)
  const bookingsToday = useMemo<BookingRowData[]>(() => {
    const todayDateString = dayjs().tz(userTimeZone).format("YYYY-MM-DD");

    return (data?.bookings ?? [])
      .filter(
        (booking: BookingOutput) =>
          dayjs(booking.startTime).tz(userTimeZone).format("YYYY-MM-DD") === todayDateString
      )
      .map((booking) => ({
        type: "data" as const,
        booking,
        recurringInfo: booking.recurringEventId ? recurringInfoMap.get(booking.recurringEventId) : undefined,
        isToday: true,
      }));
  }, [data?.bookings, recurringInfoMap, userTimeZone]);

  // Combine data with section separators for "upcoming" tab
  const finalData = useMemo<RowData[]>(() => {
    // For other statuses, just return the flat list
    if (status !== "upcoming") {
      return flatData;
    }

    // For "upcoming" status, organize into "Today" and "Next" sections
    const merged: RowData[] = [];
    if (bookingsToday.length > 0) {
      merged.push({ type: "separator" as const, label: t("today") }, ...bookingsToday);
    }
    if (flatData.length > 0) {
      merged.push({ type: "separator" as const, label: t("next") }, ...flatData);
    }
    return merged;
  }, [bookingsToday, flatData, status, t]);

  return finalData;
}
