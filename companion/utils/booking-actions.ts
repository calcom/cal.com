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
import type { Booking } from "../services/types/bookings.types";
import type { EventType } from "../services/types/event-types.types";

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
  booking: NormalizedBooking;
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

export type BookingStatus = "ACCEPTED" | "PENDING" | "CANCELLED" | "REJECTED";

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalizes a booking object from API response to a consistent format.
 * - Normalizes status to uppercase
 * - Converts time strings to Date objects
 * - Ensures consistent field names
 */
export function normalizeBooking(booking: Booking): NormalizedBooking {
  // Normalize status to uppercase (API v2 may return lowercase)
  const status = (booking.status?.toUpperCase() || "PENDING") as BookingStatus;

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
    isRecorded: (booking as any).isRecorded,
    rescheduled: booking.rescheduled,
    fromReschedule: booking.fromReschedule,
    recurringEventId: booking.recurringEventId,
    eventTypeId: booking.eventTypeId,
    user: booking.user,
    hosts: booking.hosts,
    attendees: booking.attendees,
    seatsReferences: (booking as any).seatsReferences,
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
  return booking.status === "CANCELLED";
}

/**
 * Check if booking is rejected.
 */
export function isBookingRejected(booking: NormalizedBooking): boolean {
  return booking.status === "REJECTED";
}

/**
 * Check if booking is pending (unconfirmed).
 */
export function isBookingPending(booking: NormalizedBooking): boolean {
  return booking.status === "PENDING";
}

/**
 * Check if booking is confirmed (accepted).
 */
export function isBookingConfirmed(booking: NormalizedBooking): boolean {
  return booking.status === "ACCEPTED";
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
 * Get the visibility and enabled state for all booking actions.
 * This is the main entry point for action gating.
 */
export function getBookingActions(context: BookingActionContext): BookingActionsResult {
  const { booking, eventType, currentUserId, currentUserEmail, isOnline = true } = context;
  const now = new Date();

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
  const minimumRescheduleNotice = (eventType as any)?.minimumRescheduleNotice ?? null;
  const allowReschedulingPastBookings = (eventType as any)?.allowReschedulingPastBookings ?? false;

  // Check minimum reschedule notice (only applies to non-organizers)
  const withinMinimumNotice =
    !isOrganizerOrHost &&
    isWithinMinimumRescheduleNotice(booking.startTime, minimumRescheduleNotice, now);

  // ============================================================================
  // Reschedule Action
  // ============================================================================
  const reschedule: BookingActionResult = {
    visible: true,
    enabled: true,
    needsData: eventType ? undefined : ["eventType"],
  };

  if (!isOnline) {
    reschedule.enabled = false;
    reschedule.disabledReason = "OFFLINE";
  } else if (isCancelled) {
    reschedule.enabled = false;
    reschedule.disabledReason = "BOOKING_CANCELLED";
  } else if (isRejected) {
    reschedule.enabled = false;
    reschedule.disabledReason = "BOOKING_REJECTED";
  } else if (isPending) {
    reschedule.enabled = false;
    reschedule.disabledReason = "BOOKING_PENDING";
  } else if (isPast && !allowReschedulingPastBookings) {
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
  // ============================================================================
  const rescheduleRequest: BookingActionResult = {
    visible: isOrganizerOrHost,
    enabled: isOrganizerOrHost,
    needsData: eventType ? undefined : ["eventType"],
  };

  if (!isOnline) {
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "OFFLINE";
  } else if (!isOrganizerOrHost) {
    rescheduleRequest.visible = false;
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "NOT_ORGANIZER";
  } else if (isCancelled) {
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "BOOKING_CANCELLED";
  } else if (isRejected) {
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "BOOKING_REJECTED";
  } else if (isPending) {
    rescheduleRequest.enabled = false;
    rescheduleRequest.disabledReason = "BOOKING_PENDING";
  } else if (isPast && !allowReschedulingPastBookings) {
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
  // ============================================================================
  const cancel: BookingActionResult = {
    visible: true,
    enabled: true,
  };

  if (!isOnline) {
    cancel.enabled = false;
    cancel.disabledReason = "OFFLINE";
  } else if (isCancelled) {
    cancel.enabled = false;
    cancel.disabledReason = "BOOKING_CANCELLED";
  } else if (isRejected) {
    cancel.enabled = false;
    cancel.disabledReason = "BOOKING_REJECTED";
  } else if (isPast) {
    cancel.enabled = false;
    cancel.disabledReason = "BOOKING_IN_PAST";
  } else if (disableCancelling) {
    cancel.enabled = false;
    cancel.disabledReason = "CANCELLING_DISABLED";
  }

  // ============================================================================
  // Change Location Action
  // ============================================================================
  const changeLocation: BookingActionResult = {
    visible: true,
    enabled: true,
  };

  if (!isOnline) {
    changeLocation.enabled = false;
    changeLocation.disabledReason = "OFFLINE";
  } else if (isCancelled) {
    changeLocation.enabled = false;
    changeLocation.disabledReason = "BOOKING_CANCELLED";
  } else if (isRejected) {
    changeLocation.enabled = false;
    changeLocation.disabledReason = "BOOKING_REJECTED";
  } else if (isPending) {
    changeLocation.enabled = false;
    changeLocation.disabledReason = "BOOKING_PENDING";
  } else if (isPast) {
    changeLocation.enabled = false;
    changeLocation.disabledReason = "BOOKING_IN_PAST";
  }

  // ============================================================================
  // Add Guests Action
  // ============================================================================
  const addGuests: BookingActionResult = {
    visible: !disableGuests,
    enabled: !disableGuests,
    needsData: eventType ? undefined : ["eventType"],
  };

  if (!isOnline) {
    addGuests.enabled = false;
    addGuests.disabledReason = "OFFLINE";
  } else if (disableGuests) {
    addGuests.visible = false;
    addGuests.enabled = false;
    addGuests.disabledReason = "GUESTS_DISABLED";
  } else if (isCancelled) {
    addGuests.enabled = false;
    addGuests.disabledReason = "BOOKING_CANCELLED";
  } else if (isRejected) {
    addGuests.enabled = false;
    addGuests.disabledReason = "BOOKING_REJECTED";
  } else if (isPending) {
    addGuests.enabled = false;
    addGuests.disabledReason = "BOOKING_PENDING";
  } else if (isPast) {
    addGuests.enabled = false;
    addGuests.disabledReason = "BOOKING_IN_PAST";
  }

  // ============================================================================
  // View Recordings Action
  // ============================================================================
  const viewRecordings: BookingActionResult = {
    visible: isCalVideo,
    enabled: isCalVideo && isPast && isConfirmed && Boolean(booking.isRecorded),
  };

  if (!isCalVideo) {
    viewRecordings.visible = false;
    viewRecordings.enabled = false;
    viewRecordings.disabledReason = "NOT_CAL_VIDEO";
  } else if (!isPast) {
    viewRecordings.enabled = false;
    viewRecordings.disabledReason = "BOOKING_IN_PAST";
  } else if (!isConfirmed) {
    viewRecordings.enabled = false;
    viewRecordings.disabledReason = "BOOKING_PENDING";
  } else if (!booking.isRecorded) {
    viewRecordings.enabled = false;
    viewRecordings.disabledReason = "NO_RECORDINGS";
  }

  // ============================================================================
  // Meeting Session Details Action
  // ============================================================================
  const meetingSessionDetails: BookingActionResult = {
    visible: isCalVideo,
    enabled: isCalVideo && isPast && isConfirmed,
  };

  if (!isCalVideo) {
    meetingSessionDetails.visible = false;
    meetingSessionDetails.enabled = false;
    meetingSessionDetails.disabledReason = "NOT_CAL_VIDEO";
  } else if (!isPast) {
    meetingSessionDetails.enabled = false;
    meetingSessionDetails.disabledReason = "BOOKING_IN_PAST";
  } else if (!isConfirmed) {
    meetingSessionDetails.enabled = false;
    meetingSessionDetails.disabledReason = "BOOKING_PENDING";
  }

  // ============================================================================
  // Mark No-Show Action
  // ============================================================================
  const markNoShow: BookingActionResult = {
    visible: true,
    enabled: (isPast || isOngoing) && !isPending,
  };

  if (!isOnline) {
    markNoShow.enabled = false;
    markNoShow.disabledReason = "OFFLINE";
  } else if (isPending) {
    markNoShow.enabled = false;
    markNoShow.disabledReason = "BOOKING_PENDING";
  } else if (!isPast && !isOngoing) {
    markNoShow.enabled = false;
    markNoShow.disabledReason = "BOOKING_IN_PAST";
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
