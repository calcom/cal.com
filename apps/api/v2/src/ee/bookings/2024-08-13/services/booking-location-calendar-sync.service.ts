import type { BookingWithUserAndEventDetails, CalendarEvent } from "@calcom/platform-libraries";
import { buildCalEventFromBooking, sendLocationChangeEmailsAndSMS, updateEvent } from "@calcom/platform-libraries";
import { Injectable, Logger } from "@nestjs/common";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingLocationCredentialService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-location-credential.service";

@Injectable()
export class BookingLocationCalendarSyncService_2024_08_13 {
  private readonly logger = new Logger("BookingLocationCalendarSyncService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly credentialService: BookingLocationCredentialService_2024_08_13
  ) {}

  async buildCalEventFromBookingData(
    booking: BookingWithUserAndEventDetails,
    location: string,
    conferenceCredentialId: number | null
  ): Promise<CalendarEvent> {
    return buildCalEventFromBooking({
      booking: {
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime,
        endTime: booking.endTime,
        userPrimaryEmail: booking.userPrimaryEmail,
        uid: booking.uid,
        destinationCalendar: booking.destinationCalendar,
        user: booking.user
          ? {
              destinationCalendar: booking.user.destinationCalendar,
            }
          : null,
        attendees: booking.attendees.map((attendee: BookingWithUserAndEventDetails["attendees"][number]) => ({
          email: attendee.email,
          name: attendee.name,
          timeZone: attendee.timeZone,
          locale: attendee.locale,
        })),
        eventType: booking.eventType
          ? {
              title: booking.eventType.title,
              recurringEvent: booking.eventType.recurringEvent,
              seatsPerTimeSlot: booking.eventType.seatsPerTimeSlot,
              seatsShowAttendees: booking.eventType.seatsShowAttendees,
              hideOrganizerEmail: booking.eventType.hideOrganizerEmail,
              customReplyToEmail: booking.eventType.customReplyToEmail,
            }
          : null,
        iCalUID: booking.iCalUID,
        iCalSequence: booking.iCalSequence,
      },
      organizer: {
        email: booking.user?.email || "",
        name: booking.user?.name ?? null,
        timeZone: booking.user?.timeZone || "UTC",
        locale: booking.user?.locale ?? null,
      },
      location,
      conferenceCredentialId,
      organizationId: booking.user?.profiles?.[0]?.organizationId ?? null,
    });
  }

  async sendLocationChangeNotifications(
    evt: CalendarEvent,
    bookingUid: string,
    newLocation: string,
    eventTypeMetadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await sendLocationChangeEmailsAndSMS({ ...evt, location: newLocation }, eventTypeMetadata);
    } catch (error) {
      this.logger.error(
        `Failed to send location change emails for booking uid=${bookingUid}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async syncCalendarEvent(bookingId: number, newLocation: string): Promise<void> {
    const booking = await this.bookingsRepository.getBookingByIdWithUserAndEventDetails(bookingId);

    if (!booking || !booking.user) {
      this.logger.log(`syncCalendarEvent - No booking or user found for id=${bookingId}`);
      return;
    }

    const calendarReferences = booking.references.filter(
      (ref) => ref.type.includes("_calendar") && !ref.deleted
    );

    if (calendarReferences.length === 0) {
      this.logger.log(`syncCalendarEvent - No calendar references for booking id=${bookingId}`);
      return;
    }

    const evt = await this.buildCalEventFromBookingData(booking, newLocation, null);

    for (const reference of calendarReferences) {
      const credential = await this.credentialService.getCredentialForReference(reference, booking.user.credentials);

      if (!credential) {
        this.logger.warn(
          `syncCalendarEvent - No credential found for reference id=${reference.id}, credentialId=${reference.credentialId}`
        );
        continue;
      }

      try {
        await updateEvent(credential, evt, reference.uid, reference.externalCalendarId);
        this.logger.log(
          `syncCalendarEvent - Successfully updated calendar event for reference id=${reference.id}`
        );
      } catch (error) {
        this.logger.error(
          `syncCalendarEvent - Failed to update calendar for reference id=${reference.id}`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }
}
