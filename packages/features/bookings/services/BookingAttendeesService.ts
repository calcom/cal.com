import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { BookingAttendeesRemoveService } from "@calcom/features/bookings/services/BookingAttendeesRemoveService";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { Booking, TUser } from "@calcom/trpc/server/routers/viewer/bookings/addGuests.handler";
import {
  buildCalendarEvent,
  getBooking,
  getOrganizerData,
  prepareAttendeesList,
  sanitizeAndFilterGuests,
  updateBookingAttendees,
  updateCalendarEvent,
  validateGuestsFieldEnabled,
  validateUserPermissions,
} from "@calcom/trpc/server/routers/viewer/bookings/addGuests.handler";
import type { TAddGuestsInputSchema } from "@calcom/trpc/server/routers/viewer/bookings/addGuests.schema";
import type { CalendarEvent } from "@calcom/types/Calendar";

type Attendee = TAddGuestsInputSchema["guests"][number];

type AddAttendeeInput = {
  bookingId: number;
  attendee: Attendee;
  user: TUser;
  emailsEnabled?: boolean;
};

export type CreatedAttendee = {
  id: number;
  bookingId: number;
  email: string;
  name: string;
  timeZone: string;
  locale: string | null;
  phoneNumber: string | null;
};

type RemoveAttendeeInput = {
  bookingId: number;
  attendeeId: number;
  user: TUser;
  emailsEnabled?: boolean;
};

export type BookingAttendeesServiceDeps = {
  bookingRepository: BookingRepository;
  bookingAttendeesRemoveService: BookingAttendeesRemoveService;
};

export class BookingAttendeesService {
  constructor(private readonly deps: BookingAttendeesServiceDeps) {}

  async getBookingAttendees(bookingUid: string) {
    const booking = await this.deps.bookingRepository.findByUidIncludeEventTypeAttendeesAndUser({
      bookingUid,
    });

    if (!booking) {
      throw new Error(`Booking with uid ${bookingUid} not found`);
    }

    return booking.attendees;
  }

  async getBookingAttendee(bookingUid: string, attendeeId: number) {
    const booking = await this.deps.bookingRepository.findByUidIncludeEventTypeAttendeesAndUser({
      bookingUid,
    });

    if (!booking) {
      throw new Error(`Booking with uid ${bookingUid} not found`);
    }

    const attendee = booking.attendees.find((a) => a.id === attendeeId);
    if (!attendee) {
      throw new ErrorWithCode(
        ErrorCode.NotFound,
        `Attendee with id ${attendeeId} not found in booking ${bookingUid}`
      );
    }

    return attendee;
  }

  async addAttendee({
    bookingId,
    attendee,
    user,
    emailsEnabled = true,
  }: AddAttendeeInput): Promise<CreatedAttendee> {
    const booking = await getBooking(bookingId);

    await validateUserPermissions(booking, user);

    validateGuestsFieldEnabled(booking);

    const organizer = await getOrganizerData(booking.userId);

    const validatedAttendees = await sanitizeAndFilterGuests([attendee], booking);

    const newAttendeeDetails = validatedAttendees.map((a) => ({
      name: a.name || "",
      email: a.email,
      timeZone: a.timeZone || organizer.timeZone,
      locale: a.language || organizer.locale,
      phoneNumber: a.phoneNumber || null,
    }));

    const attendeeEmail = attendee.email;

    const updatedBooking = await updateBookingAttendees(
      bookingId,
      newAttendeeDetails,
      [attendeeEmail],
      booking
    );

    const allAttendees = await prepareAttendeesList(updatedBooking.attendees);

    const evt = await buildCalendarEvent(booking, organizer, allAttendees);

    await updateCalendarEvent(booking, evt);

    if (emailsEnabled) {
      await this.sendAttendeeNotification(evt, booking, attendeeEmail);
    }

    const createdAttendee = updatedBooking.attendees.find(
      (a) => a.email.toLowerCase() === attendeeEmail.toLowerCase()
    );

    if (!createdAttendee) {
      throw new Error("Attendee was created but could not be found");
    }

    return {
      id: createdAttendee.id,
      bookingId,
      email: createdAttendee.email,
      name: createdAttendee.name,
      timeZone: createdAttendee.timeZone,
      locale: createdAttendee.locale,
      phoneNumber: createdAttendee.phoneNumber,
    };
  }

  async removeAttendee(input: RemoveAttendeeInput) {
    return this.deps.bookingAttendeesRemoveService.removeAttendee(input);
  }

  private async sendAttendeeNotification(
    evt: CalendarEvent,
    booking: Booking,
    attendeeEmail: string
  ): Promise<void> {
    const emailsAndSmsHandler = new BookingEmailSmsHandler({
      logger: logger,
    });

    await emailsAndSmsHandler.handleAddAttendee({
      evt,
      eventType: {
        metadata: eventTypeMetaDataSchemaWithTypedApps.parse(booking?.eventType?.metadata),
        schedulingType: booking.eventType?.schedulingType || null,
      },
      newGuests: [attendeeEmail],
    });
  }
}

export type { RemovedAttendee } from "@calcom/features/bookings/services/BookingAttendeesRemoveService";
