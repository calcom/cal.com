import type { BookingFilter } from "@/hooks";
import type { Booking } from "@/services/calcom";

import { safeLogError, safeLogWarn } from "./safeLogger";

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
    case "recurring":
      return {
        icon: "repeat-outline" as const,
        title: "No recurring bookings",
        text: "Your recurring bookings will show up here.",
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
    if (Number.isNaN(date.getTime())) {
      safeLogWarn("Invalid date string provided to formatTime", { dateString });
      return "";
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    safeLogError("Error formatting time:", error);
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
    if (Number.isNaN(date.getTime())) {
      safeLogWarn("Invalid date string provided to formatDate", { dateString });
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
    safeLogError("Error formatting date:", error);
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
    if (Number.isNaN(date.getTime())) {
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
  } catch (_error) {
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
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return `${date.getFullYear()}-${date.getMonth()}`;
  } catch (_error) {
    return "";
  }
};

/**
 * Format recurrence pattern into human-readable text
 * @param bookings Array of bookings in the recurring series
 * @returns Formatted recurrence text (e.g., "Every week for 5 occurrences")
 */
export const formatRecurrencePattern = (bookings: Booking[]): string | null => {
  if (bookings.length === 0) return null;

  // Try to determine frequency from booking dates
  if (bookings.length < 2) {
    return `${bookings.length} occurrence`;
  }

  // Sort bookings by date
  const sortedBookings = [...bookings].sort((a, b) => {
    const aTime = new Date(a.start || a.startTime || "").getTime();
    const bTime = new Date(b.start || b.startTime || "").getTime();
    return aTime - bTime;
  });

  // Calculate interval between first two bookings
  const first = new Date(sortedBookings[0].start || sortedBookings[0].startTime || "");
  const second = new Date(sortedBookings[1].start || sortedBookings[1].startTime || "");
  const diffMs = second.getTime() - first.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let frequency = "";
  if (diffDays === 1) {
    frequency = "day";
  } else if (diffDays === 7) {
    frequency = "week";
  } else if (diffDays >= 28 && diffDays <= 31) {
    frequency = "month";
  } else if (diffDays >= 365 && diffDays <= 366) {
    frequency = "year";
  } else {
    // Unknown frequency, just show count
    return `${bookings.length} occurrences`;
  }

  return `Every ${frequency} for ${bookings.length} occurrences`;
};

/**
 * Represents a group of recurring bookings with the same recurringBookingUid
 */
export interface RecurringBookingGroup {
  recurringBookingUid: string;
  bookings: Booking[];
  firstUpcoming: Booking;
  remainingCount: number;
  hasUnconfirmed: boolean;
  recurrenceText: string | null;
}

/**
 * Type definition for list items (used in FlatList)
 */
export type ListItem =
  | { type: "monthHeader"; monthYear: string; key: string }
  | { type: "booking"; booking: Booking; key: string }
  | { type: "recurringGroup"; group: RecurringBookingGroup; key: string };

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
 * Group recurring bookings by their recurringBookingUid
 * @param bookings Array of recurring bookings to group
 * @returns Array of RecurringBookingGroup objects
 */
export const groupRecurringBookings = (bookings: Booking[]): RecurringBookingGroup[] => {
  const now = new Date();
  const groupMap = new Map<string, Booking[]>();

  // Group bookings by recurringBookingUid
  bookings.forEach((booking) => {
    const uid = booking.recurringBookingUid;
    if (!uid) return;

    if (!groupMap.has(uid)) {
      groupMap.set(uid, []);
    }
    groupMap.get(uid)?.push(booking);
  });

  // Convert map to RecurringBookingGroup array
  const groups: RecurringBookingGroup[] = [];

  groupMap.forEach((groupBookings, recurringBookingUid) => {
    // Sort bookings by start time (ascending)
    const sortedBookings = [...groupBookings].sort((a, b) => {
      const aStart = new Date(a.start || a.startTime || "").getTime();
      const bStart = new Date(b.start || b.startTime || "").getTime();
      return aStart - bStart;
    });

    // Find first upcoming (non-cancelled) booking
    const upcomingBookings = sortedBookings.filter((b) => {
      const startTime = new Date(b.start || b.startTime || "");
      const isCancelled = b.status?.toLowerCase() === "cancelled";
      const isRejected = b.status?.toLowerCase() === "rejected";
      return startTime >= now && !isCancelled && !isRejected;
    });

    const firstUpcoming = upcomingBookings[0] || sortedBookings[0];

    // Count remaining (non-cancelled, non-rejected) bookings - reuse upcomingBookings
    const remainingCount = upcomingBookings.length;

    // Check if any booking requires confirmation
    const hasUnconfirmed = sortedBookings.some(
      (b) =>
        b.status?.toLowerCase() === "pending" ||
        b.status?.toLowerCase() === "requires_confirmation" ||
        b.requiresConfirmation
    );

    groups.push({
      recurringBookingUid,
      bookings: sortedBookings,
      firstUpcoming,
      remainingCount,
      hasUnconfirmed,
      recurrenceText: formatRecurrencePattern(sortedBookings),
    });
  });

  // Sort groups by first upcoming booking date
  return groups.sort((a, b) => {
    const aStart = new Date(a.firstUpcoming.start || a.firstUpcoming.startTime || "").getTime();
    const bStart = new Date(b.firstUpcoming.start || b.firstUpcoming.startTime || "").getTime();
    return aStart - bStart;
  });
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
      booking.description
        ?.toLowerCase()
        .includes(searchLower) ||
      // Search in event type title
      booking.eventType?.title
        ?.toLowerCase()
        .includes(searchLower) ||
      // Search in attendee names
      booking.attendees?.some((attendee) => attendee.name?.toLowerCase().includes(searchLower)) ||
      // Search in attendee emails
      booking.attendees?.some((attendee) => attendee.email?.toLowerCase().includes(searchLower)) ||
      // Search in location
      booking.location
        ?.toLowerCase()
        .includes(searchLower) ||
      // Search in user name
      booking.user?.name
        ?.toLowerCase()
        .includes(searchLower) ||
      // Search in user email
      booking.user?.email
        ?.toLowerCase()
        .includes(searchLower)
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

/**
 * Format a date string to a complete date/time string
 * @param dateString ISO date string
 * @returns Formatted date/time string (e.g., "Mon, Dec 25, 2:30 PM")
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Get color for booking status
 * @param status Booking status string
 * @returns Hex color code
 */
export const getStatusColor = (status: string): string => {
  // API v2 2024-08-13 returns status in lowercase, so normalize to uppercase for comparison
  const normalizedStatus = status.toLowerCase();
  switch (normalizedStatus) {
    case "accepted":
      return "#34C759";
    case "pending":
      return "#FF9500";
    case "cancelled":
      return "#FF3B30";
    case "rejected":
      return "#FF3B30";
    default:
      return "#666";
  }
};

/**
 * Format status text for display
 * @param status Booking status string
 * @returns Capitalized status text
 */
export const formatStatusText = (status: string): string => {
  // Capitalize first letter for display
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

/**
 * Get formatted display string for host and attendees
 * @param booking Booking object
 * @param currentUserEmail Current user's email (optional)
 * @returns Formatted string or null if no host/attendees
 */
export const getHostAndAttendeesDisplay = (
  booking: Booking,
  currentUserEmail?: string
): string | null => {
  const hasHostOrAttendees =
    (booking.hosts && booking.hosts.length > 0) ||
    booking.user ||
    (booking.attendees && booking.attendees.length > 0);

  if (!hasHostOrAttendees) return null;

  const hostEmail = booking.hosts?.[0]?.email?.toLowerCase() || booking.user?.email?.toLowerCase();
  const isCurrentUserHost =
    currentUserEmail && hostEmail && currentUserEmail.toLowerCase() === hostEmail;

  const hostName = isCurrentUserHost
    ? "You"
    : booking.hosts?.[0]?.name ||
      booking.hosts?.[0]?.email ||
      booking.user?.name ||
      booking.user?.email;

  const attendeesDisplay =
    booking.attendees && booking.attendees.length > 0
      ? booking.attendees.length === 1
        ? booking.attendees[0].name || booking.attendees[0].email
        : booking.attendees
            .slice(0, 2)
            .map((att) => att.name || att.email)
            .join(", ") +
          (booking.attendees.length > 2 ? ` and ${booking.attendees.length - 2} more` : "")
      : null;

  if (hostName && attendeesDisplay) {
    return `${hostName} and ${attendeesDisplay}`;
  } else if (hostName) {
    return hostName;
  } else if (attendeesDisplay) {
    return attendeesDisplay;
  }
  return null;
};

/**
 * Get shareable booking details message
 * @param booking Booking object
 * @returns Formatted booking details string
 */
export const getBookingDetailsMessage = (booking: Booking): string => {
  const attendeesList = booking.attendees?.map((att) => att.name).join(", ") || "No attendees";
  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";

  return `${booking.description ? `${booking.description}\n\n` : ""}Time: ${formatDateTime(
    startTime
  )} - ${formatTime(endTime)}\nAttendees: ${attendeesList}\nStatus: ${formatStatusText(booking.status)}${
    booking.location ? `\nLocation: ${booking.location}` : ""
  }`;
};
