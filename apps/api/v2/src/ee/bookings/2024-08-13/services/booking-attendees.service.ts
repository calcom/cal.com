import { BookingAttendeesService } from "@calcom/platform-libraries/bookings";
import { ErrorCode, ErrorWithCode } from "@calcom/platform-libraries/errors";
import type { AddAttendeeInput_2024_08_13 } from "@calcom/platform-types";
import { BookingAttendee } from "@calcom/platform-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { BookingAttendeeOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/add-attendee.output";
import {
  BookingAttendeeWithId_2024_08_13,
} from "@/ee/bookings/2024-08-13/outputs/get-booking-attendees.output";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import type { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";

@Injectable()
export class BookingAttendeesService_2024_08_13 {
  private bookingAttendeesService: BookingAttendeesService;

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly platformBookingsService: PlatformBookingsService
  ) {
    this.bookingAttendeesService = new BookingAttendeesService();
  }

  async getBookingAttendees(
    bookingUid: string
  ): Promise<BookingAttendeeWithId_2024_08_13[]> {
    const attendees = await this.bookingAttendeesService.getBookingAttendees(
      bookingUid
    );

    return attendees.map((attendee) =>
      plainToClass(
        BookingAttendeeWithId_2024_08_13,
        {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          displayEmail: this.getDisplayEmail(attendee.email),
          timeZone: attendee.timeZone,
          language: attendee.locale ?? undefined,
          absent: attendee.noShow ?? false,
          phoneNumber: attendee.phoneNumber ?? undefined,
        },
        { strategy: "excludeAll" }
      )
    );
  }

  async getBookingAttendee(
    bookingUid: string,
    attendeeId: number
  ): Promise<BookingAttendee> {
    try {
      const attendee = await this.bookingAttendeesService.getBookingAttendee(
        bookingUid,
        attendeeId
      );

      return plainToClass(
        BookingAttendee,
        {
          name: attendee.name,
          email: attendee.email,
          displayEmail: this.getDisplayEmail(attendee.email),
          timeZone: attendee.timeZone,
          language: attendee.locale ?? undefined,
          absent: attendee.noShow ?? false,
          phoneNumber: attendee.phoneNumber ?? undefined,
        },
        { strategy: "excludeAll" }
      );
    } catch (e) {
      if (e instanceof ErrorWithCode && e.code === ErrorCode.NotFound) {
        throw new NotFoundException(e.message);
      }
      throw e;
    }
  }

  async addAttendee(
    bookingUid: string,
    input: AddAttendeeInput_2024_08_13,
    user: ApiAuthGuardUser
  ): Promise<BookingAttendeeOutput_2024_08_13> {
    const booking = await this.bookingsRepository.getByUidWithEventType(
      bookingUid
    );
    if (!booking) {
      throw new NotFoundException(`Booking with uid ${bookingUid} not found`);
    }

    const platformClientParams = booking.eventTypeId
      ? await this.platformBookingsService.getOAuthClientParams(
          booking.eventTypeId
        )
      : undefined;

    const emailsEnabled = platformClientParams
      ? platformClientParams.arePlatformEmailsEnabled
      : true;

    const createdAttendee = await this.bookingAttendeesService.addAttendee({
      bookingId: booking.id,
      attendee: {
        email: input.email,
        name: input.name,
        timeZone: input.timeZone,
        phoneNumber: input.phoneNumber,
        language: input.language,
      },
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        uuid: user.uuid,
      },
      emailsEnabled,
      actionSource: "API_V2",
    });

    return plainToClass(
      BookingAttendeeOutput_2024_08_13,
      {
        id: createdAttendee.id,
        bookingId: createdAttendee.bookingId,
        name: createdAttendee.name,
        email: createdAttendee.email,
        displayEmail: this.getDisplayEmail(createdAttendee.email),
        timeZone: createdAttendee.timeZone,
        language: createdAttendee.locale ?? undefined,
        absent: false,
        phoneNumber: createdAttendee.phoneNumber ?? undefined,
      },
      { strategy: "excludeAll" }
    );
  }

  private getDisplayEmail(email: string): string {
    return email.replace(/\+[a-zA-Z0-9]{25}/, "");
  }
}
