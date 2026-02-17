import type { EventNameObjectType } from "@calcom/lib/event";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

//Razorpay webhook job event payload
export interface RazorpayAppRevokedJobData {
  accountId: string;
  rawEvent?: Record<string, unknown>;
}

export interface RazorpayPaymentLinkPaidJobData {
  paymentId: string;
  paymentLinkId: string;
  rawEvent?: Record<string, unknown>;
}

// ============================================================================
// Booking Emails
// ============================================================================

/**
 * Email type for booking emails
 */
export type BookingEmailType = "scheduled" | "request" | "rescheduled" | "cancelled";

/**
 * Serialized person - locale string instead of translate function
 * (functions are not JSON-serializable for job queues)
 */
type SerializedPerson = {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  timeZone: string;
  phoneNumber?: string | null;
  language: {
    locale: string;
  };
};

/**
 * Serialized team member - locale string instead of translate function
 */
type SerializedTeamMember = {
  id?: number;
  email: string;
  name: string;
  timeZone: string;
  language: {
    locale: string;
  };
};

/**
 * Serialized CalendarEvent - all translate functions replaced with locale strings
 * to allow JSON serialization for job queue transport
 */
type SerializedCalendarEvent = {
  uid?: string;
  bookingId?: number;
  title: string;
  type: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  organizer: SerializedPerson;
  attendees: SerializedPerson[];
  team?: {
    name: string;
    id: number;
    members: SerializedTeamMember[];
  };
  [key: string]: unknown;
};

/**
 * Booking Emails Job Data
 *
 * Supports all four email types dispatched as separate named jobs:
 * - scheduled  → confirmation emails for accepted bookings
 * - request    → pending approval emails
 * - rescheduled → rescheduled booking emails
 * - cancelled  → cancellation emails
 */
export interface BookingEmailsJobData {
  /**
   * Serialized CalendarEvent (translate functions stripped for transport)
   */
  calEvent: SerializedCalendarEvent;

  /**
   * Optional event name object for dynamic event name formatting
   */
  eventNameObject?: EventNameObjectType;

  /**
   * Whether host confirmation emails are disabled
   */
  isHostConfirmationEmailsDisabled: boolean;

  /**
   * Whether attendee confirmation emails are disabled
   */
  isAttendeeConfirmationEmailDisabled: boolean;

  /**
   * Optional event type metadata
   */
  eventTypeMetadata?: EventTypeMetadata;

  /**
   * Current attendee (for scheduled emails)
   */
  curAttendee?: {
    email?: string;
    phoneNumber?: string | null;
    name?: string;
  };

  /**
   * Email type determines which email function is called
   */
  emailType: "scheduled" | "request" | "rescheduled" | "cancelled";

  /**
   * First attendee (required for request emails only)
   */
  firstAttendee?: Omit<SerializedPerson, "language"> & {
    language: { locale: string };
  };
}

export type DefaultJob = BookingEmailJob | RazorpayAppRevokedJobData | RazorpayPaymentLinkPaidJobData;
