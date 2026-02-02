/**
 * Centralized Booking Action Gating Utility
 *
 * This module provides a single source of truth for booking action visibility and enabled state.
 * It matches the web's semantics from apps/web/components/booking/actions/bookingActions.ts
 *
 * Parity Scope (In Scope Now):
 * - cancel, reschedule, reschedule_request, change_location, add_guests
 * - view_recordings, meeting_session_details, mark_no_show
 *
 * Deferred:
 * - report, reroute, reassign, charge_card
 */
import type { Booking, BookingStatus } from "@/services/types/bookings.types";
import type { EventType } from "@/services/types/event-types.types";

// ============================================================================
// Types
// ============================================================================

export interface BookingActionResult {
  visible: boolean;
  enabled: boolean;
  disabledReason?: DisabledReason;
  needsData?: string[];
}

export type DisabledReason =
  | "BOOKING_IN_PAST"
  | "BOOKING_CANCELLED"
  | "BOOKING_REJECTED"
  | "BOOKING_PENDING"
  | "WITHIN_MINIMUM_NOTICE"
  | "RESCHEDULING_DISABLED"
  | "CANCELLING_DISABLED"
  | "GUESTS_DISABLED"
  | "NOT_CAL_VIDEO"
  | "NO_RECORDINGS"
  | "NO_ATTENDEE_DATA"
  | "SEATED_BOOKING"
  | "NOT_ORGANIZER"
  | "OFFLINE";

export interface BookingActionsResult {
  reschedule: BookingActionResult;
  rescheduleRequest: BookingActionResult;
  cancel: BookingActionResult;
  changeLocation: BookingActionResult;
  addGuests: BookingActionResult;
  viewRecordings: BookingActionResult;
  meetingSessionDetails: BookingActionResult;
  markNoShow: BookingActionResult;
}

export interface BookingActionContext {
  booking: Booking | NormalizedBooking;
  eventType?: EventType | null;
  currentUserId?: number;
  currentUserEmail?: string;
  isOnline?: boolean;
}

export interface NormalizedBooking {
  id: number;
  uid: string;
  title: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  location?: string;
  isRecorded?: boolean;
  rescheduled?: boolean;
  fromReschedule?: string;
  recurringEventId?: string;
  eventTypeId?: number;
  user?: {
    id: number;
    email: string;
    name: string;
  };
  hosts?: Array<{
    id?: number | string;
    email?: string;
    name?: string;
  }>;
  attendees?: Array<{
    id?: number | string;
    email: string;
    name: string;
    noShow?: boolean;
  }>;
  seatsReferences?: Array<{
    referenceUid: string;
    attendee?: {
      email: string;
    };
  }>;
  payment?: Array<{
    id: number;
    success: boolean;
    paymentOption: string;
  }>;
}

export type { BookingStatus } from "@/services/types/bookings.types";

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalizes a booking object from API response to a consistent format.
 * - Normalizes status to lowercase (API v2 format)
 * - Converts time strings to Date objects
 * - Ensures consistent field names
 */
export function normalizeBooking(booking: Booking): NormalizedBooking {
  const status = (booking.status?.toLowerCase() || "pending") as BookingStatus;

  // Normalize times - prefer startTime/endTime, fallback to start/end
  const startTimeStr = booking.startTime || booking.start || "";
  const endTimeStr = booking.endTime || booking.end || "";

  return {
    id: booking.id,
    uid: booking.uid,
    title: booking.title,
    status,
    startTime: new Date(startTimeStr),
    endTime: new Date(endTimeStr),
    location: booking.location,
    isRecorded: (booking as { isRecorded?: boolean }).isRecorded,
    rescheduled: booking.rescheduled,
    fromReschedule: booking.fromReschedule,
    recurringEventId: booking.recurringEventId,
    eventTypeId: booking.eventTypeId,
    user: booking.user,
    hosts: booking.hosts,
    attendees: booking.attendees,
    seatsReferences: (
      booking as { seatsReferences?: Array<{ referenceUid: string; attendee: { email: string } }> }
    ).seatsReferences,
    payment: booking.payment,
  };
}

// ============================================================================
// Time Computation Functions (matching web's exact definitions)
// ============================================================================

/**
 * Check if booking is in the past.
 * Web definition: new Date(booking.endTime) < new Date()
 */
export function isBookingInPast(booking: NormalizedBooking, now: Date = new Date()): boolean {
  return booking.endTime < now;
}

/**
 * Check if booking is upcoming.
 * Web definition: new Date(booking.endTime) >= new Date()
 */
export function isBookingUpcoming(booking: NormalizedBooking, now: Date = new Date()): boolean {
  return booking.endTime >= now;
}

/**
 * Check if booking is currently ongoing.
 * Web definition: isUpcoming && new Date() >= new Date(booking.startTime)
 */
export function isBookingOngoing(booking: NormalizedBooking, now: Date = new Date()): boolean {
  return isBookingUpcoming(booking, now) && now >= booking.startTime;
}

/**
 * Check if booking is cancelled.
 */
export function isBookingCancelled(booking: NormalizedBooking): boolean {
  return booking.status === "cancelled";
}

/**
 * Check if booking is rejected.
 */
export function isBookingRejected(booking: NormalizedBooking): boolean {
  return booking.status === "rejected";
}

/**
 * Check if booking is pending (unconfirmed).
 */
export function isBookingPending(booking: NormalizedBooking): boolean {
  return booking.status === "pending";
}

/**
 * Check if booking is confirmed (accepted).
 */
export function isBookingConfirmed(booking: NormalizedBooking): boolean {
  return booking.status === "accepted";
}

// ============================================================================
// Role Detection Functions
// ============================================================================

/**
 * Check if the current user is the organizer of the booking.
 */
export function isUserOrganizer(
  booking: NormalizedBooking,
  userId?: number,
  userEmail?: string
): boolean {
  if (!booking.user) return false;

  if (userId && booking.user.id === userId) return true;
  if (userEmail && booking.user.email?.toLowerCase() === userEmail.toLowerCase()) return true;

  return false;
}

/**
 * Check if the current user is a host of the booking.
 */
export function isUserHost(
  booking: NormalizedBooking,
  userId?: number,
  userEmail?: string
): boolean {
  if (!booking.hosts || booking.hosts.length === 0) return false;

  return booking.hosts.some((host) => {
    if (userId && host.id !== undefined && String(host.id) === String(userId)) return true;
    if (userEmail && host.email?.toLowerCase() === userEmail.toLowerCase()) return true;
    return false;
  });
}

/**
 * Check if the current user is an attendee of the booking.
 */
export function isUserAttendee(
  booking: NormalizedBooking,
  userId?: number,
  userEmail?: string
): boolean {
  if (!booking.attendees || booking.attendees.length === 0) return false;

  return booking.attendees.some((attendee) => {
    if (userId && attendee.id !== undefined && String(attendee.id) === String(userId)) return true;
    if (userEmail && attendee.email?.toLowerCase() === userEmail.toLowerCase()) return true;
    return false;
  });
}

/**
 * Get the user's seat reference UID if they are an attendee of a seated booking.
 */
export function getUserSeatReferenceUid(
  booking: NormalizedBooking,
  userEmail?: string
): string | undefined {
  if (!booking.seatsReferences || !userEmail) return undefined;

  const userSeat = booking.seatsReferences.find(
    (seat) => seat.attendee?.email?.toLowerCase() === userEmail.toLowerCase()
  );

  return userSeat?.referenceUid;
}

/**
 * Check if booking is a seated booking.
 */
export function isSeatedBooking(booking: NormalizedBooking): boolean {
  return Boolean(booking.seatsReferences && booking.seatsReferences.length > 0);
}

// ============================================================================
// Location Detection Functions
// ============================================================================

/**
 * Check if the booking location is Cal Video.
 * Web definition: !booking.location || booking.location === "integrations:daily" || location.trim() === ""
 */
export function isCalVideoLocation(booking: NormalizedBooking): boolean {
  const location = booking.location;

  if (!location) return true;
  if (location === "integrations:daily") return true;
  if (typeof location === "string" && location.trim() === "") return true;
  if (location.includes("cal.com/video") || location.includes("cal-video")) return true;

  return false;
}

// ============================================================================
// Minimum Reschedule Notice Check
// ============================================================================

/**
 * Check if the booking is within the minimum reschedule notice period.
 * This should only apply to non-organizers (attendees).
 */
export function isWithinMinimumRescheduleNotice(
  bookingStartTime: Date,
  minimumRescheduleNotice: number | null | undefined,
  now: Date = new Date()
): boolean {
  if (!minimumRescheduleNotice || minimumRescheduleNotice <= 0) return false;

  const noticeEndTime = new Date(bookingStartTime.getTime() - minimumRescheduleNotice * 60 * 1000);
  return now >= noticeEndTime;
}

// ============================================================================
// Main Action Gating Function
// ============================================================================

/**
 * Helper to check if a booking is already normalized (has Date objects for times)
 */
function isNormalizedBooking(booking: Booking | NormalizedBooking): booking is NormalizedBooking {
  return booking.startTime instanceof Date;
}

/**
 * Get the visibility and enabled state for all booking actions.
 * This is the main entry point for action gating.
 * Accepts either a raw Booking or NormalizedBooking and normalizes internally.
 */
export function getBookingActions(context: BookingActionContext): BookingActionsResult {
  const {
    booking: rawBooking,
    eventType,
    currentUserId,
    currentUserEmail,
    isOnline = true,
  } = context;
  const now = new Date();

  // Normalize booking if needed (convert string times to Date objects)
  const booking: NormalizedBooking = isNormalizedBooking(rawBooking)
    ? rawBooking
    : normalizeBooking(rawBooking);

  // Compute booking state flags
  const isPast = isBookingInPast(booking, now);
  const isOngoing = isBookingOngoing(booking, now);
  const isCancelled = isBookingCancelled(booking);
  const isRejected = isBookingRejected(booking);
  const isPending = isBookingPending(booking);
  const isConfirmed = isBookingConfirmed(booking);
  const isCalVideo = isCalVideoLocation(booking);
  const isSeated = isSeatedBooking(booking);

  // Compute user role flags
  const isOrganizer = isUserOrganizer(booking, currentUserId, currentUserEmail);
  const isHost = isUserHost(booking, currentUserId, currentUserEmail);
  const isOrganizerOrHost = isOrganizer || isHost;

  // Get event type settings (with defaults)
  const disableRescheduling = eventType?.disableRescheduling ?? false;
  const disableCancelling = eventType?.disableCancelling ?? false;
  const disableGuests = eventType?.disableGuests ?? false;
  const minimumRescheduleNotice = eventType?.minimumRescheduleNotice ?? null;
  const allowReschedulingPastBookings = eventType?.allowReschedulingPastBookings ?? false;

  // Check minimum reschedule notice (only applies to non-organizers)
  const withinMinimumNotice =
    !isOrganizerOrHost &&
    isWithinMinimumRescheduleNotice(booking.startTime, minimumRescheduleNotice, now);

  // ============================================================================
  // Reschedule Action
  // Visible for upcoming, non-cancelled, non-pending bookings
  // ============================================================================
  const isUpcoming = !isPast;
  const canReschedule =
    (isUpcoming || allowReschedulingPastBookings) &&
    !isCancelled &&
    !isRejected &&
    !isPending &&
    !disableRescheduling;
  const reschedule: BookingActionResult = {
    visible: isUpcoming || allowReschedulingPastBookings,
    enabled: canReschedule,
    needsData: eventType ? undefined : ["eventType"],
  };

  if (!isOnline) {
    reschedule.enabled = false;
    reschedule.disabledReason = "OFFLINE";
  } else if (isCancelled) {
    reschedule.visible = false;
    reschedule.enabled = false;
    reschedule.disabledReason = "BOOKING_CANCELLED";
  } else if (isRejected) {
    reschedule.visible = false;
    reschedule.enabled = false;
    reschedule.disabledReason = "BOOKING_REJECTED";
  } else if (isPending) {
    reschedule.visible = false;
    reschedule.enabled = false;
    reschedule.disabledReason = "BOOKING_PENDING";
  } else if (isPast && !allowReschedulingPastBookings) {
    reschedule.visible = false;
    reschedule.enabled = false;
    reschedule.disabledReason = "BOOKING_IN_PAST";
  } else if (disableRescheduling) {
    reschedule.enabled = false;
    reschedule.disabledReason = "RESCHEDULING_DISABLED";
  } else if (withinMinimumNotice) {
    reschedule.enabled = false;
    reschedule.disabledReason = "WITHIN_MINIMUM_NOTICE";
  }

  // ============================================================================
  // Reschedule Request Action (for organizers to request attendee to reschedule)
  // Visible only for organizers/hosts with upcoming, non-cancelled, non-pending bookings
  // ============================================================================
  const canRequestReschedule =
    isOrganizerOrHost &&
    (isUpcoming || allowReschedulingPastBookings) &&
    !isCancelled &&
    !isRejected &&
    !isPending &&
    !disableRescheduling &&
    !isSeated;
  const rescheduleRequest: BookingActionResult = {
    visible: isOrganizerOrHost && (isUpcoming || allowReschedulingPastBookings),
    enabled: canRequestReschedule,
    needsData: eventType ? undefined : ["eventType"],
  };

  if (!isOrganizerOrHost) {
    rescheduleRequest.visible = false;
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "NOT_ORGANIZER";
  } else if (!isOnline) {
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "OFFLINE";
  } else if (isCancelled) {
    rescheduleRequest.visible = false;
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "BOOKING_CANCELLED";
  } else if (isRejected) {
    rescheduleRequest.visible = false;
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "BOOKING_REJECTED";
  } else if (isPending) {
    rescheduleRequest.visible = false;
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "BOOKING_PENDING";
  } else if (isPast && !allowReschedulingPastBookings) {
    rescheduleRequest.visible = false;
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "BOOKING_IN_PAST";
  } else if (disableRescheduling) {
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "RESCHEDULING_DISABLED";
  } else if (isSeated) {
    // Web disables reschedule_request for seated bookings
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "SEATED_BOOKING";
  }

  // ============================================================================
  // Cancel Action
  // Visible for upcoming, non-cancelled bookings
  // ============================================================================
  const canCancel = isUpcoming && !isCancelled && !isRejected && !disableCancelling;
  const cancel: BookingActionResult = {
    visible: canCancel,
    enabled: canCancel,
  };

  if (!canCancel) {
    if (isCancelled) {
      cancel.visible = false;
      cancel.enabled = false;
      cancel.disabledReason = "BOOKING_CANCELLED";
    } else if (isRejected) {
      cancel.visible = false;
      cancel.enabled = false;
      cancel.disabledReason = "BOOKING_REJECTED";
    } else if (isPast) {
      cancel.visible = false;
      cancel.enabled = false;
      cancel.disabledReason = "BOOKING_IN_PAST";
    } else if (disableCancelling) {
      cancel.enabled = false;
      cancel.disabledReason = "CANCELLING_DISABLED";
    }
  } else if (!isOnline) {
    cancel.enabled = false;
    cancel.disabledReason = "OFFLINE";
  }

  // ============================================================================
  // Change Location Action
  // Visible for upcoming, non-cancelled, non-pending bookings
  // ============================================================================
  const canChangeLocation = isUpcoming && !isCancelled && !isRejected && !isPending;
  const changeLocation: BookingActionResult = {
    visible: canChangeLocation,
    enabled: canChangeLocation,
  };

  if (!canChangeLocation) {
    changeLocation.visible = false;
    changeLocation.enabled = false;
    if (isCancelled) {
      changeLocation.disabledReason = "BOOKING_CANCELLED";
    } else if (isRejected) {
      changeLocation.disabledReason = "BOOKING_REJECTED";
    } else if (isPending) {
      changeLocation.disabledReason = "BOOKING_PENDING";
    } else if (isPast) {
      changeLocation.disabledReason = "BOOKING_IN_PAST";
    }
  } else if (!isOnline) {
    changeLocation.enabled = false;
    changeLocation.disabledReason = "OFFLINE";
  }

  // ============================================================================
  // Add Guests Action
  // Visible for upcoming, non-cancelled, non-pending bookings (if guests enabled)
  // ============================================================================
  const canAddGuests = isUpcoming && !isCancelled && !isRejected && !isPending && !disableGuests;
  const addGuests: BookingActionResult = {
    visible: canAddGuests,
    enabled: canAddGuests,
    needsData: eventType ? undefined : ["eventType"],
  };

  if (disableGuests) {
    addGuests.visible = false;
    addGuests.enabled = false;
    addGuests.disabledReason = "GUESTS_DISABLED";
  } else if (!canAddGuests) {
    addGuests.visible = false;
    addGuests.enabled = false;
    if (isCancelled) {
      addGuests.disabledReason = "BOOKING_CANCELLED";
    } else if (isRejected) {
      addGuests.disabledReason = "BOOKING_REJECTED";
    } else if (isPending) {
      addGuests.disabledReason = "BOOKING_PENDING";
    } else if (isPast) {
      addGuests.disabledReason = "BOOKING_IN_PAST";
    }
  } else if (!isOnline) {
    addGuests.enabled = false;
    addGuests.disabledReason = "OFFLINE";
  }

  // ============================================================================
  // View Recordings Action
  // Only visible for past Cal Video bookings
  // Note: We show this for all past Cal Video bookings, not just those with isRecorded=true,
  // because the isRecorded field may not always be reliable. The view-recordings screen
  // will handle showing an empty state if there are no recordings.
  // ============================================================================
  const canViewRecordings = isCalVideo && isPast && isConfirmed && !isCancelled && !isRejected;
  const viewRecordings: BookingActionResult = {
    visible: canViewRecordings,
    enabled: canViewRecordings,
  };

  if (!isCalVideo) {
    viewRecordings.visible = false;
    viewRecordings.enabled = false;
    viewRecordings.disabledReason = "NOT_CAL_VIDEO";
  } else if (!isPast) {
    viewRecordings.visible = false;
    viewRecordings.enabled = false;
    viewRecordings.disabledReason = "BOOKING_IN_PAST";
  } else if (!isConfirmed || isCancelled || isRejected) {
    viewRecordings.visible = false;
    viewRecordings.enabled = false;
    viewRecordings.disabledReason = isCancelled
      ? "BOOKING_CANCELLED"
      : isRejected
        ? "BOOKING_REJECTED"
        : "BOOKING_PENDING";
  }

  // ============================================================================
  // Meeting Session Details Action
  // Only visible for past Cal Video bookings
  // ============================================================================
  const canViewSessionDetails = isCalVideo && isPast && isConfirmed && !isCancelled && !isRejected;
  const meetingSessionDetails: BookingActionResult = {
    visible: canViewSessionDetails,
    enabled: canViewSessionDetails,
  };

  if (!isCalVideo) {
    meetingSessionDetails.visible = false;
    meetingSessionDetails.enabled = false;
    meetingSessionDetails.disabledReason = "NOT_CAL_VIDEO";
  } else if (!isPast) {
    meetingSessionDetails.visible = false;
    meetingSessionDetails.enabled = false;
    meetingSessionDetails.disabledReason = "BOOKING_IN_PAST";
  } else if (!isConfirmed || isCancelled || isRejected) {
    meetingSessionDetails.visible = false;
    meetingSessionDetails.enabled = false;
    meetingSessionDetails.disabledReason = isCancelled
      ? "BOOKING_CANCELLED"
      : isRejected
        ? "BOOKING_REJECTED"
        : "BOOKING_PENDING";
  }

  // ============================================================================
  // Mark No-Show Action
  // Visible only for past or ongoing bookings (not for future/upcoming bookings)
  // This matches the booking list behavior where Mark No-Show is not shown for upcoming
  // ============================================================================
  const canMarkNoShow = (isPast || isOngoing) && !isPending && !isCancelled && !isRejected;
  const markNoShow: BookingActionResult = {
    visible: canMarkNoShow,
    enabled: canMarkNoShow,
  };

  if (!canMarkNoShow) {
    markNoShow.visible = false;
    markNoShow.enabled = false;
    if (isPending) {
      markNoShow.disabledReason = "BOOKING_PENDING";
    } else if (isCancelled) {
      markNoShow.disabledReason = "BOOKING_CANCELLED";
    } else if (isRejected) {
      markNoShow.disabledReason = "BOOKING_REJECTED";
    } else {
      markNoShow.disabledReason = "BOOKING_IN_PAST"; // Actually means booking is in future
    }
  } else if (!isOnline) {
    markNoShow.enabled = false;
    markNoShow.disabledReason = "OFFLINE";
  } else if (!booking.attendees || booking.attendees.length === 0) {
    markNoShow.enabled = false;
    markNoShow.disabledReason = "NO_ATTENDEE_DATA";
  }

  return {
    reschedule,
    rescheduleRequest,
    cancel,
    changeLocation,
    addGuests,
    viewRecordings,
    meetingSessionDetails,
    markNoShow,
  };
}

// ============================================================================
// Helper function to get disabled reason message
// ============================================================================

export function getDisabledReasonMessage(reason: DisabledReason): string {
  const messages: Record<DisabledReason, string> = {
    BOOKING_IN_PAST: "This booking is in the past",
    BOOKING_CANCELLED: "This booking has been cancelled",
    BOOKING_REJECTED: "This booking has been rejected",
    BOOKING_PENDING: "This booking is pending confirmation",
    WITHIN_MINIMUM_NOTICE: "Within minimum reschedule notice period",
    RESCHEDULING_DISABLED: "Rescheduling is disabled for this event type",
    CANCELLING_DISABLED: "Cancelling is disabled for this event type",
    GUESTS_DISABLED: "Adding guests is disabled for this event type",
    NOT_CAL_VIDEO: "Only available for Cal Video meetings",
    NO_RECORDINGS: "No recordings available for this meeting",
    NO_ATTENDEE_DATA: "Attendee information not available",
    SEATED_BOOKING: "Not available for seated bookings",
    NOT_ORGANIZER: "Only available for organizers",
    OFFLINE: "You are currently offline",
  };

  return messages[reason] || "Action not available";
}
