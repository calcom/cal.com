import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import AttendeeCancelledEmail from "@calcom/emails/templates/attendee-cancelled-email";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import type { BookingEventHandlerService } from "@calcom/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { PrismaBookingAttendeeRepository } from "@calcom/features/bookings/repositories/PrismaBookingAttendeeRepository";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getTranslation } from "@calcom/i18n/server";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import logger from "@calcom/lib/logger";
import type { BookingResponses } from "@calcom/prisma/zod-utils";
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
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

type Attendee = TAddGuestsInputSchema["guests"][number];

type AddAttendeeInput = {
  bookingId: number;
  attendee: Attendee;
  user: TUser;
  emailsEnabled?: boolean;
  actionSource: ActionSource;
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
  actionSource: ActionSource;
};

export type RemovedAttendee = {
  id: number;
  bookingId: number;
  name: string;
  email: string;
  timeZone: string;
};

export type BookingAttendeesServiceDeps = {
  bookingEventHandlerService: BookingEventHandlerService;
  featuresRepository: FeaturesRepository;
  bookingAttendeeRepository: PrismaBookingAttendeeRepository;
  bookingRepository: BookingRepository;
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
    actionSource,
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

    const organizationId = user.organizationId ?? null;
    const isBookingAuditEnabled = organizationId
      ? await this.deps.featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit")
      : false;

    await this.deps.bookingEventHandlerService.onAttendeeAdded({
      bookingUid: booking.uid,
      actor: makeUserActor(user.uuid),
      organizationId,
      source: actionSource,
      auditData: {
        added: [attendeeEmail],
      },
      isBookingAuditEnabled,
    });

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

  async removeAttendee({
    bookingId,
    attendeeId,
    user,
    emailsEnabled = true,
    actionSource,
  }: RemoveAttendeeInput): Promise<RemovedAttendee> {
    const booking = await getBooking(bookingId);
    await validateUserPermissions(booking, user);

    const attendeeToRemove = this.findAndValidateAttendee(booking, attendeeId);
    const remainingAttendees = booking.attendees.filter((a) => a.id !== attendeeId);
    const attendeesList = await prepareAttendeesList(remainingAttendees);
    await this.removeAttendeeFromBooking(bookingId, attendeeId, attendeeToRemove.email, booking);

    const organizer = await getOrganizerData(booking.userId);

    const evt = await buildCalendarEvent(booking, organizer, attendeesList);
    await updateCalendarEvent(booking, evt);

    if (emailsEnabled) {
      void this.prepareAttendeePerson(attendeeToRemove)
        .then((removedAttendeePerson) => this.sendCancelledEmailToAttendee(evt, removedAttendeePerson))
        .catch((error) => logger.error("Failed to send cancellation email to removed attendee", { error }));
    }

    const organizationId = user.organizationId ?? null;
    const isBookingAuditEnabled = organizationId
      ? await this.deps.featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit")
      : false;

    await this.deps.bookingEventHandlerService.onAttendeeRemoved({
      bookingUid: booking.uid,
      actor: makeUserActor(user.uuid),
      organizationId,
      source: actionSource,
      auditData: {
        attendees: {
          old: booking.attendees.map((a) => a.email),
          new: remainingAttendees.map((a) => a.email),
        },
      },
      isBookingAuditEnabled,
    });

    return {
      id: attendeeToRemove.id,
      bookingId: booking.id,
      name: attendeeToRemove.name,
      email: attendeeToRemove.email,
      timeZone: attendeeToRemove.timeZone,
    };
  }

  private findAndValidateAttendee(booking: Booking, attendeeId: number): Booking["attendees"][number] {
    const attendee = booking.attendees.find((a) => a.id === attendeeId);

    if (!attendee) {
      throw ErrorWithCode.Factory.NotFound("attendee_not_found");
    }

    const sortedAttendees = [...booking.attendees].sort((a, b) => a.id - b.id);
    const primaryAttendee = sortedAttendees[0];

    if (primaryAttendee && attendee.id === primaryAttendee.id) {
      throw ErrorWithCode.Factory.BadRequest("cannot_remove_primary_attendee");
    }

    return attendee;
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

  private async removeAttendeeFromBooking(
    bookingId: number,
    attendeeId: number,
    attendeeEmail: string,
    booking: Booking
  ): Promise<void> {
    const bookingResponses = booking.responses as BookingResponses;
    const baseEmailToRemove = extractBaseEmail(attendeeEmail).toLowerCase();

    const updatedGuests = (bookingResponses?.guests || []).filter((guestEmail: string) => {
      return extractBaseEmail(guestEmail).toLowerCase() !== baseEmailToRemove;
    });

    await this.deps.bookingAttendeeRepository.deleteByIdAndUpdateBookingResponses(attendeeId, bookingId, {
      ...bookingResponses,
      guests: updatedGuests,
    });
  }

  private async prepareAttendeePerson(attendee: Booking["attendees"][number]): Promise<Person> {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  }

  private async sendCancelledEmailToAttendee(evt: CalendarEvent, attendee: Person): Promise<void> {
    try {
      const email = new AttendeeCancelledEmail(evt, attendee);
      await email.sendEmail();
    } catch (error) {
      logger.error("Failed to send cancellation email to removed attendee", {
        error,
      });
    }
  }
}
