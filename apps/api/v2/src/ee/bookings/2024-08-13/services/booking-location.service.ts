import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import type { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { EventTypeAccessService } from "@/modules/event-types/services/event-type-access.service";
import { UsersRepository } from "@/modules/users/users.repository";
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import {
  updateEvent,
  CredentialRepository,
  buildCalEventFromBooking,
} from "@calcom/platform-libraries";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import type {
  UpdateBookingLocationInput_2024_08_13,
  BookingInputLocation_2024_08_13,
  UpdateBookingInputLocation_2024_08_13,
} from "@calcom/platform-types";
import type { Booking } from "@calcom/prisma/client";

@Injectable()
export class BookingLocationService_2024_08_13 {
  private readonly logger = new Logger("BookingLocationService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly usersRepository: UsersRepository,
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly eventTypeAccessService: EventTypeAccessService
  ) {}

  async updateBookingLocation(
    bookingUid: string,
    input: UpdateBookingLocationInput_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const existingBooking =
      await this.bookingsRepository.getBookingByUidWithUserAndEventDetails(
        bookingUid
      );
    if (!existingBooking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }

    if (existingBooking.eventTypeId && existingBooking.eventType) {
      const eventType =
        await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(
          existingBooking.eventTypeId
        );
      if (eventType) {
        const isAllowed =
          await this.eventTypeAccessService.userIsEventTypeAdminOrOwner(
            user,
            eventType
          );
        if (!isAllowed) {
          throw new ForbiddenException(
            "User is not authorized to update this booking location. User must be the event type owner, host, team admin or owner, or org admin or owner."
          );
        }
      }
    }

    const { location } = input;

    if (location) {
      const locationValue = this.getLocationValue(location);
      if (locationValue) {
        await this.syncCalendarEvent(existingBooking.id, locationValue);
      }
      return await this.updateLocation(existingBooking, location, user);
    }

    return this.bookingsService.getBooking(existingBooking.uid, user);
  }

  private async updateLocation(
    existingBooking: Booking,
    inputLocation: UpdateBookingInputLocation_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const bookingUid = existingBooking.uid;
    const bookingLocation =
      this.getLocationValue(inputLocation) ?? existingBooking.location;

    if (!existingBooking.userId) {
      throw new NotFoundException(
        `No user found for booking with uid=${bookingUid}`
      );
    }

    if (!existingBooking.eventTypeId) {
      throw new NotFoundException(
        `No event type found for booking with uid=${bookingUid}`
      );
    }

    const existingBookingHost = await this.usersRepository.findById(
      existingBooking.userId
    );

    if (!existingBookingHost) {
      throw new NotFoundException(
        `No user found for booking with uid=${bookingUid}`
      );
    }

    const bookingFieldsLocation = this.inputService.transformLocation(
      inputLocation as BookingInputLocation_2024_08_13
    );

    const responses = (existingBooking.responses || {}) as Record<
      string,
      unknown
    >;
    const { location: _existingLocation, ...rest } = responses;

    const updatedBookingResponses = {
      ...rest,
      location: bookingFieldsLocation,
    };

    const updatedBooking = await this.bookingsRepository.updateBooking(
      bookingUid,
      {
        location: bookingLocation,
        responses: updatedBookingResponses,
      }
    );

    return this.bookingsService.getBooking(updatedBooking.uid, user);
  }

  /*
  1. fetch booking references via booking id or uid
  2. if booking reference not present, return
  3. if reference present, use credentials from in there to retreive calendar event and then update it accordingly
  */
  private async syncCalendarEvent(
    bookingId: number,
    newLocation: string
  ): Promise<void> {
    // 1. Fetch booking with references and user credentials
    const booking =
      await this.bookingsRepository.getBookingByIdWithUserAndEventDetails(
        bookingId
      );

    if (!booking || !booking.user) {
      this.logger.log(
        `syncCalendarEvent - No booking or user found for id=${bookingId}`
      );
      return;
    }

    const calendarReferences = booking.references.filter(
      (ref) => ref.type.includes("_calendar") && !ref.deleted
    );

    if (calendarReferences.length === 0) {
      this.logger.log(
        `syncCalendarEvent - No calendar references for booking id=${bookingId}`
      );
      return;
    }

    const evt = await buildCalEventFromBooking({
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
        attendees: booking.attendees.map((attendee) => ({
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
        email: booking.user.email,
        name: booking.user.name,
        timeZone: booking.user.timeZone,
        locale: booking.user.locale,
      },
      location: newLocation,
      conferenceCredentialId: null,
      organizationId: booking.user.profiles?.[0]?.organizationId ?? null,
    });

    for (const reference of calendarReferences) {
      const credential = await this.getCredentialForReference(
        reference,
        booking.user.credentials
      );

      if (!credential) {
        this.logger.warn(
          `syncCalendarEvent - No credential found for reference id=${reference.id}, credentialId=${reference.credentialId}`
        );
        continue;
      }

      try {
        await updateEvent(
          credential,
          evt,
          reference.uid,
          reference.externalCalendarId
        );
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

  /**
   * Get the credential for a booking reference, following the pattern from EventManager.
   * Tries to find in local credentials first, then falls back to DB lookup.
   */
  private async getCredentialForReference(
    reference: {
      credentialId: number | null;
      delegationCredentialId: string | null;
      type: string;
    },
    userCredentials: Array<{
      id: number;
      delegationCredentialId: string | null;
      type: string;
    }>
  ): Promise<CredentialForCalendarService | null> {
    if (reference.delegationCredentialId) {
      const delegationCred = userCredentials.find(
        (cred) =>
          cred.delegationCredentialId === reference.delegationCredentialId
      );
      if (delegationCred) {
        const credFromDB =
          await CredentialRepository.findCredentialForCalendarServiceById({
            id: delegationCred.id,
          });
        return credFromDB;
      }
    }

    if (reference.credentialId && reference.credentialId > 0) {
      const localCred = userCredentials.find(
        (cred) => cred.id === reference.credentialId
      );
      if (localCred) {
        const credFromDB =
          await CredentialRepository.findCredentialForCalendarServiceById({
            id: localCred.id,
          });
        return credFromDB;
      }

      const credFromDB =
        await CredentialRepository.findCredentialForCalendarServiceById({
          id: reference.credentialId,
        });
      return credFromDB;
    }

    const typeCred = userCredentials.find(
      (cred) => cred.type === reference.type
    );
    if (typeCred) {
      const credFromDB =
        await CredentialRepository.findCredentialForCalendarServiceById({
          id: typeCred.id,
        });
      return credFromDB;
    }

    return null;
  }

  private getLocationValue(
    loc: UpdateBookingInputLocation_2024_08_13
  ): string | undefined {
    if (loc.type === "address") return loc.address;
    if (loc.type === "link") return loc.link;
    if (loc.type === "phone") return loc.phone;
    if (loc.type === "attendeeAddress") return loc.address;
    if (loc.type === "attendeePhone") return loc.phone;
    if (loc.type === "attendeeDefined") return loc.location;

    this.logger.log(
      `Booking location service getLocationValue - loc ${JSON.stringify(
        loc
      )} was passed but the type is not supported.`
    );

    return undefined;
  }
}
