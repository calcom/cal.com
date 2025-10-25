// --- IMPORT YOUR BUILDER ---
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import type { BookingType } from "@calcom/features/bookings/lib/handleNewBooking/originalRescheduledBookingUtils";
import type { EventNameObjectType } from "@calcom/features/eventtypes/lib/eventNaming";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type {
  Attendee,
  Booking,
  BookingReference,
  DestinationCalendar,
  EventType,
  Host,
  Prisma,
  PrismaClient,
  Team,
  User,
} from "@calcom/prisma/client";
import type { BookingResponses, EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person, VideoCallData } from "@calcom/types/Calendar";

import { EmailsAndSmsSideEffectsPayload, BookingActionMap } from "./BookingEmailSmsHandler";

// Import your existing types

export type SanitizedBookingPayload = {
  action: "BOOKING_CONFIRMED" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED";

  /** * The UID of the booking that was created, rescheduled, or requested.
   * This is the main key to fetch all PII.
   */
  bookingUid: string;

  /** * For RESCHEDULED actions, this is the UID of the booking *before* it was rescheduled.
   * Required to get details of the original event, like the original host.
   */
  originalBookingUid?: string;

  /** * For RESCHEDULED Round-Robin actions, pass this boolean.
   * It is not PII.
   */
  changedOrganizer?: boolean;

  /** * For RESCHEDULED actions, pass this boolean.
   * It is not PII.
   */
  isRescheduledByBooker?: boolean;

  /**
   * For Seated events (Payload 8), provide the specific `referenceUid`
   * of the BookingSeat this notification is for.
   */
  attendeeSeatReferenceUid?: string;
};

// Includes all data needed by the CalendarEventBuilder and other handlers
const bookingHydrationInclude = {
  attendees: true,
  user: true, // This is the Organizer
  destinationCalendar: true, // <-- ADD THIS: For the booking itself
  eventType: {
    include: {
      users: {
        // <-- MODIFY THIS
        include: {
          destinationCalendar: true, // <-- ADD THIS
        },
      },
      hosts: {
        include: {
          user: {
            // <-- MODIFY THIS
            include: {
              destinationCalendar: true, // <-- ADD THIS
            },
          },
        },
      },
      team: {
        include: {
          members: {
            include: {
              user: true, // Note: You can add destinationCalendar here too if needed
            },
          },
        },
      },
      workflows: {
        include: {
          workflow: {
            include: {
              steps: true,
            },
          },
        },
      },
    },
  },
  references: true, // For Video Call Data
  seatsReferences: true, // For Seated Events
};

// This creates a reusable type for our fully-fetched booking
type BookingWithIncludes = Prisma.BookingGetPayload<{
  include: typeof bookingHydrationInclude;
}>;

/**
 * Reconstructs the full, PII-rich payload from a sanitized, ID-based payload.
 * This runs inside your secure environment (e.g., Trigger.dev task).
 */
export class BookingHydrationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Main entry point. Takes the PII-free payload and returns the full payload.
   */
  public async hydrate(payload: SanitizedBookingPayload): Promise<EmailsAndSmsSideEffectsPayload> {
    // 1. Fetch the primary booking data
    const booking = await this.getBookingByUid(payload.bookingUid);
    if (!booking || !booking.eventType) {
      throw new Error(`Booking ${payload.bookingUid} or its EventType not found.`);
    }

    // 2. Route based on the action
    switch (payload.action) {
      case "BOOKING_CONFIRMED":
        return this._buildConfirmedPayload(booking, payload);

      case "BOOKING_RESCHEDULED": {
        if (!payload.originalBookingUid) {
          throw new Error("Rescheduled action requires originalBookingUid.");
        }
        const originalBooking = await this.getBookingByUid(payload.originalBookingUid);
        if (!originalBooking) {
          throw new Error(`Original booking ${payload.originalBookingUid} not found.`);
        }

        return this._buildRescheduledPayload(booking, originalBooking, payload);
      }
      case "BOOKING_REQUESTED":
        return this._buildRequestedPayload(booking, payload);

      default: {
        const exhaustiveCheck: never = payload.action;
        throw new Error(`Unhandled action: ${exhaustiveCheck}`);
      }
    }
  }

  /** Fetches a booking with all PII relations needed for hydration */
  private async getBookingByUid(uid: string) {
    return this.prisma.booking.findUnique({
      where: { uid },
      include: bookingHydrationInclude,
    });
  }

  // --- PAYLOAD BUILDERS ---

  private async _buildConfirmedPayload(
    booking: BookingWithIncludes,
    payload: SanitizedBookingPayload
  ): Promise<EmailsAndSmsSideEffectsPayload> {
    if (!booking.eventType) {
      throw new Error(`Booking ${payload.bookingUid} eventType not found.`);
    }
    const evt = await this._buildCalendarEvent(booking, payload);
    return {
      action: "BOOKING_CONFIRMED",
      data: {
        evt: evt,
        eventType: {
          metadata: (booking.eventType.metadata || {}) as EventTypeMetadata,
          schedulingType: booking.eventType.schedulingType,
        },
        workflows: booking.eventType.workflows.map((w) => w.workflow),
        eventNameObject: this._buildEventNameObject(booking, evt),
        additionalInformation: {},
        additionalNotes: booking.description,
        customInputs: booking.customInputs as Record<string, string>,
      },
    };
  }

  private async _buildRescheduledPayload(
    newBooking: BookingWithIncludes,
    originalBooking: BookingWithIncludes,
    payload: SanitizedBookingPayload
  ): Promise<EmailsAndSmsSideEffectsPayload> {
    if (!newBooking.eventType) {
      throw new Error(`Booking ${payload.bookingUid} eventType not found.`);
    }
    const eventTypeHosts = await Promise.all(
      (newBooking.eventType.users.length
        ? newBooking.eventType.users
        : newBooking.eventType.hosts.map((h) => h.user)
      ).map(async (user) => ({
        ...(await this._userToPerson(user)),
        destinationCalendar: user.destinationCalendar,
        isFixed:
          (newBooking.eventType && newBooking.eventType.hosts.find((h) => h.userId === user.id)?.isFixed) ||
          false,
      }))
    );

    return {
      action: "BOOKING_RESCHEDULED",
      data: {
        evt: await this._buildCalendarEvent(newBooking, payload),
        eventType: {
          metadata: (newBooking.eventType.metadata || {}) as EventTypeMetadata,
          schedulingType: newBooking.eventType.schedulingType,
        },
        rescheduleReason: (newBooking.responses as Record<string, string>)?.rescheduleReason || undefined,
        additionalInformation: {},
        additionalNotes: newBooking.description,
        iCalUID: newBooking.iCalUID || "",
        users: eventTypeHosts,
        changedOrganizer: payload.changedOrganizer,
        isRescheduledByBooker: !!payload.isRescheduledByBooker,
        originalRescheduledBooking: this._formatAsBookingType(originalBooking),
      },
    };
  }

  private async _buildRequestedPayload(
    booking: BookingWithIncludes,
    payload: SanitizedBookingPayload
  ): Promise<EmailsAndSmsSideEffectsPayload> {
    if (!booking.eventType) {
      throw new Error(`Booking ${payload.bookingUid} eventType not found.`);
    }
    const evt = await this._buildCalendarEvent(booking, payload);
    return {
      action: "BOOKING_REQUESTED",
      data: {
        evt: evt,
        eventType: {
          metadata: (booking.eventType.metadata || {}) as EventTypeMetadata,
          schedulingType: booking.eventType.schedulingType,
        },
        attendees: evt.attendees,
        additionalNotes: evt.additionalNotes,
      },
    };
  }

  // --- HELPER FUNCTIONS ---

  /**
   * --- REFACTORED ---
   * Constructs the `evt: CalendarEvent` object using the CalendarEventBuilder.
   */
  private async _buildCalendarEvent(
    booking: BookingWithIncludes,
    payload: SanitizedBookingPayload
  ): Promise<CalendarEvent> {
    if (!booking.user) {
      throw new Error(`Booking ${booking.uid} is missing an organizer (user).`);
    }

    if (!booking.eventType) {
      throw new Error(`Booking ${payload.bookingUid} eventType not found.`);
    }

    const { eventType, user: organizerUser } = booking;
    const attendeesList = await Promise.all(
      booking.attendees.map((attendee) =>
        this._attendeeToPerson(attendee, booking.responses as BookingResponses)
      )
    );
    const additionalNotes = booking.description || undefined;

    // Rebuild video call data
    const videoRef = booking.references.find((r) => r.type.endsWith("_video"));
    const videoCallData = videoRef
      ? {
          type: videoRef.type,
          id: videoRef.meetingId,
          password: videoRef.meetingPassword,
          url: videoRef.meetingUrl,
        }
      : undefined;

    const tOrganizer = await getTranslation(organizerUser?.locale ?? "en", "common");

    const builtEvt = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com", // From your logs
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        additionalNotes,
      })
      .withEventType({
        slug: eventType.slug,
        description: eventType.description,
        id: eventType.id,
        hideCalendarNotes: eventType.hideCalendarNotes,
        hideCalendarEventDetails: eventType.hideCalendarEventDetails,
        hideOrganizerEmail: eventType.hideOrganizerEmail,
        schedulingType: eventType.schedulingType,
        seatsPerTimeSlot: eventType.seatsPerTimeSlot,
        seatsShowAttendees: eventType.seatsPerTimeSlot ? eventType.seatsShowAttendees : true,
        seatsShowAvailabilityCount: eventType.seatsPerTimeSlot ? eventType.seatsShowAvailabilityCount : true,
        customReplyToEmail: eventType.customReplyToEmail,
        disableRescheduling: eventType.disableRescheduling ?? false,
        disableCancelling: eventType.disableCancelling ?? false,
      })
      .withOrganizer({
        id: organizerUser.id,
        name: organizerUser.name || "Nameless",
        email: organizerUser.email, // PII
        username: organizerUser.username || undefined,
        // usernameInOrg: organizerOrganizationProfile?.username || undefined, // Not fetched, add to include if needed
        timeZone: organizerUser.timeZone,
        language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
        timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
      })
      .withAttendees(attendeesList) // PII
      .withMetadataAndResponses({
        additionalNotes,
        customInputs: (booking.customInputs as Record<string, string>) || null,
        //TODO: convert booking responses into the expected format
        // in order to do that we will need the event-type booking fields + booking responses
        responses: (booking.responses || {}) as BookingResponses,
        // extract userFieldsResponses by looking at event-type booking fields + booking responses
        userFieldsResponses: {}, // Empty in your logs
      })
      .withLocation({
        location: booking.location, // PII
        // conferenceCredentialId, // Not fetched, add to include if needed
      })
      .withIdentifiers({
        iCalUID: booking.iCalUID || undefined,
        iCalSequence: booking.iCalSequence,
      })
      .withConfirmation({
        requiresConfirmation: !!eventType.requiresConfirmation,
        isConfirmedByDefault: !eventType.requiresConfirmation, // Assuming this logic
      })
      .withPlatformVariables({
        platformClientId: (booking.metadata as Record<string, string>)?.platformClientId,
        platformRescheduleUrl: "", // Empty in your logs
        platformCancelUrl: "", // Empty in your logs
        platformBookingUrl: "", // Empty in your logs
      })
      .withRecurring(eventType.recurringEvent ? (eventType.recurringEvent as any) : undefined)
      .withAttendeeSeatId(payload.attendeeSeatReferenceUid)
      .withUid(booking.uid)
      .withOneTimePassword(booking.oneTimePassword)
      .withTeam(
        eventType.team
          ? {
              id: eventType.team.id,
              name: eventType.team.name || "",
              members: await Promise.all(
                eventType.team.members.map(async (m) => await this._userToPerson(m.user))
              ),
            }
          : undefined
      )
      .withVideoCallData(
        videoCallData && videoCallData.id && videoCallData.password && videoCallData.url
          ? {
              ...videoCallData,
              id: videoCallData.id,
              password: videoCallData.password,
              url: videoCallData.url,
            }
          : undefined
      )
      .withAppsStatus(
        videoCallData
          ? [
              {
                // Re-create a minimal appsStatus
                appName: videoCallData.type,
                type: videoCallData.type,
                success: 1,
                failures: 0,
                errors: [],
              },
            ]
          : []
      )
      .build();

    if (!builtEvt) {
      throw new Error(`CalendarEventBuilder failed to build event for booking ${booking.uid}`);
    }

    return builtEvt;
  }

  /** Converts a Prisma User to the Person/Organizer type */
  private async _userToPerson(user: User) {
    return {
      id: user.id,
      name: user.name || "",
      email: user.email,
      username: user.username || undefined,
      timeZone: user.timeZone,
      language: {
        locale: user.locale || "en",
        translate: await getTranslation(user.locale ?? "en", "common"),
      },
      locale: user.locale,
      timeFormat: getTimeFormatStringFromUserTimeFormat(user.timeFormat),
    };
  }

  /** Converts a Prisma Attendee to the Person type */
  private async _attendeeToPerson(attendee: Attendee, responses?: BookingResponses) {
    const nameResponseValue = responses?.name;
    let firstName = "";
    let lastName = "";
    let name = attendee.name; // Default to the name on the Attendee record

    if (
      typeof nameResponseValue === "object" &&
      nameResponseValue !== null &&
      "firstName" in nameResponseValue
    ) {
      firstName = nameResponseValue.firstName || "";
      lastName = nameResponseValue.lastName || "";
      // Reconstruct full name if needed, ensuring spaces are handled
      name = [firstName, lastName].filter(Boolean).join(" ") || name;
    }

    return {
      email: attendee.email,
      name: name,
      firstName: firstName,
      lastName: lastName,
      timeZone: attendee.timeZone,
      language: {
        locale: attendee.locale || "en",
        translate: await getTranslation(attendee.locale ?? "en", "common"),
      },
    };
  }

  /** Reconstructs the `eventNameObject` from booking data */
  private _buildEventNameObject(booking: BookingWithIncludes, evt: CalendarEvent): EventNameObjectType {
    const responses = (booking.responses || {}) as NonNullable<BookingResponses>;

    if (!booking.eventType) {
      throw new Error(`Booking ${booking.uid} eventType not found.`);
    }

    const nameResponseValue = responses?.name;
    let firstName = "";
    let lastName = "";
    let name = responses.name; // Default to the name on the Attendee record

    if (
      typeof nameResponseValue === "object" &&
      nameResponseValue !== null &&
      "firstName" in nameResponseValue
    ) {
      firstName = nameResponseValue.firstName || "";
      lastName = nameResponseValue.lastName || "";
      // Reconstruct full name if needed, ensuring spaces are handled
      name = [firstName, lastName].filter(Boolean).join(" ") || name;
    }

    return {
      attendeeName: responses.name || evt.attendees[0]?.name || "",
      eventType: booking.eventType.title,
      eventName: booking.eventType.eventName,
      teamName: booking.eventType.team?.name || null,
      host: evt.organizer.name || "",
      location: evt.location || "",
      eventDuration: (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60),
      bookingFields: {
        ...responses,
        email: responses.email || "",
        name: name || "",
        firstName,
        lastName,
        guests: responses.guests || [],
        notes: responses.notes || "",
        location: responses.location || "",
      },
      t: evt.organizer.language.translate,
    };
  }

  /**
   * Formats a full Prisma booking into the `BookingType` expected by the handler
   * for `originalRescheduledBooking`.
   */
  private _formatAsBookingType(booking: BookingWithIncludes): NonNullable<BookingType> {
    return booking as unknown as NonNullable<BookingType>;
  }
}
