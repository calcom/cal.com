import type { BookingFilter } from "../hooks";
import type { Booking } from "../services/calcom";

export const getEmptyStateContent = (activeFilter: BookingFilter) => {
  switch (activeFilter) {
    case "upcoming":
      return {
        icon: "calendar-outline" as const,
        title: "No upcoming bookings",
        text: "As soon as someone books a time with you it will show up here.",
      };
    case "unconfirmed":
      return {
        icon: "calendar-outline" as const,
        title: "No unconfirmed bookings",
        text: "Your unconfirmed bookings will show up here.",
      };
    case "past":
      return {
        icon: "calendar-outline" as const,
        title: "No past bookings",
        text: "Your past bookings will show up here.",
      };
    case "cancelled":
      return {
        icon: "calendar-outline" as const,
        title: "No cancelled bookings",
        text: "Your canceled bookings will show up here.",
      };
    default:
      return {
        icon: "calendar-outline" as const,
        title: "No bookings found",
        text: "Your bookings will appear here.",
      };
  }
};

/**
 * Format a date string to a time string in 12-hour format
 * @param dateString ISO date string
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export const formatTime = (dateString: string): string => {
  if (!dateString) {
    return "";
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string:", dateString);
      return "";
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting time:", error, dateString);
    return "";
  }
};

/**
 * Format a date string to a human-readable date
 * @param dateString ISO date string
 * @param isUpcoming Whether the booking is upcoming (affects format)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, isUpcoming: boolean): string => {
  if (!dateString) {
    return "";
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string:", dateString);
      return "";
    }
    const bookingYear = date.getFullYear();
    const currentYear = new Date().getFullYear();
    const isDifferentYear = bookingYear !== currentYear;

    if (isUpcoming) {
      // Format: "ddd, D MMM" or "ddd, D MMM YYYY" if different year
      const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
      const day = date.getDate();
      const month = date.toLocaleDateString("en-US", { month: "short" });
      if (isDifferentYear) {
        return `${weekday}, ${day} ${month} ${bookingYear}`;
      }
      return `${weekday}, ${day} ${month}`;
    } else {
      // Format: "D MMMM YYYY" for past bookings
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  } catch (error) {
    console.error("Error formatting date:", error, dateString);
    return "";
  }
};

/**
 * Format a date string to month and year
 * @param dateString ISO date string
 * @returns Formatted month and year string (e.g., "December 2024" or "This month")
 */
export const formatMonthYear = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "";
    }
    const now = new Date();
    const isCurrentMonth =
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

    if (isCurrentMonth) {
      return "This month";
    }

    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    return "";
  }
};

/**
 * Get a unique key for a month and year from a date string
 * @param dateString ISO date string
 * @returns Key in format "YYYY-M" (e.g., "2024-11")
 */
export const getMonthYearKey = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "";
    }
    return `${date.getFullYear()}-${date.getMonth()}`;
  } catch (error) {
    return "";
  }
};

/**
 * Type definition for list items (used in FlatList)
 */
export type ListItem =
  | { type: "monthHeader"; monthYear: string; key: string }
  | { type: "booking"; booking: Booking; key: string };

/**
 * Group bookings by month for display in a sectioned list
 * @param bookings Array of bookings to group
 * @returns Array of list items with month headers and bookings
 */
export const groupBookingsByMonth = (bookings: Booking[]): ListItem[] => {
  const grouped: ListItem[] = [];
  let currentMonthYear: string | null = null;

  bookings.forEach((booking) => {
    const startTime = booking.start || booking.startTime || "";
    if (!startTime) return;

    const monthYearKey = getMonthYearKey(startTime);
    const monthYear = formatMonthYear(startTime);

    if (monthYearKey !== currentMonthYear) {
      currentMonthYear = monthYearKey;
      grouped.push({
        type: "monthHeader",
        monthYear,
        key: `month-${monthYearKey}`,
      });
    }

    grouped.push({
      type: "booking",
      booking,
      key: booking.id.toString(),
    });
  });

  return grouped;
};

/**
 * Search/filter bookings by query string
 * @param bookings Array of bookings to filter
 * @param searchQuery Search query string
 * @returns Filtered bookings
 */
export const searchBookings = (bookings: Booking[], searchQuery: string): Booking[] => {
  if (searchQuery.trim() === "") {
    return bookings;
  }

  const searchLower = searchQuery.toLowerCase();
  return bookings.filter(
    (booking) =>
      // Search in booking title
      booking.title?.toLowerCase().includes(searchLower) ||
      // Search in booking description
      booking.description?.toLowerCase().includes(searchLower) ||
      // Search in event type title
      booking.eventType?.title?.toLowerCase().includes(searchLower) ||
      // Search in attendee names
      (booking.attendees &&
        booking.attendees.some((attendee) => attendee.name?.toLowerCase().includes(searchLower))) ||
      // Search in attendee emails
      (booking.attendees &&
        booking.attendees.some((attendee) =>
          attendee.email?.toLowerCase().includes(searchLower)
        )) ||
      // Search in location
      booking.location?.toLowerCase().includes(searchLower) ||
      // Search in user name
      booking.user?.name?.toLowerCase().includes(searchLower) ||
      // Search in user email
      booking.user?.email?.toLowerCase().includes(searchLower)
  );
};

/**
 * Filter bookings by event type ID
 * @param bookings Array of bookings to filter
 * @param eventTypeId Event type ID to filter by (null means no filter)
 * @returns Filtered bookings
 */
export const filterByEventType = (bookings: Booking[], eventTypeId: number | null): Booking[] => {
  if (eventTypeId === null) {
    return bookings;
  }
  return bookings.filter((booking) => booking.eventTypeId === eventTypeId);
};
