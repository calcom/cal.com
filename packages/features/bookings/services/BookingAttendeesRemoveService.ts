import AttendeeCancelledEmail from "@calcom/emails/templates/attendee-cancelled-email";
import type { BookingAuditContext } from "@calcom/features/booking-audit/lib/dto/types";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import type { BookingEventHandlerService } from "@calcom/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
import type { PrismaBookingAttendeeRepository } from "@calcom/features/bookings/repositories/PrismaBookingAttendeeRepository";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getTranslation } from "@calcom/i18n/server";
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
  updateCalendarEvent,
  validateUserPermissions,
} from "@calcom/trpc/server/routers/viewer/bookings/addGuests.handler";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

type RemoveAttendeeInput = {
  bookingId: number;
  attendeeId: number;
  user: TUser;
  emailsEnabled?: boolean;
  actionSource: ActionSource;
  impersonatedByUserUuid?: string | null;
};

export type RemovedAttendee = {
  id: number;
  bookingId: number;
  name: string;
  email: string;
  timeZone: string;
};

export type BookingAttendeesRemoveServiceDeps = {
  bookingEventHandlerService: BookingEventHandlerService;
  featuresRepository: FeaturesRepository;
  bookingAttendeeRepository: PrismaBookingAttendeeRepository;
};

export class BookingAttendeesRemoveService {
  constructor(private readonly deps: BookingAttendeesRemoveServiceDeps) {}

  async removeAttendee({
    bookingId,
    attendeeId,
    user,
    emailsEnabled = true,
    actionSource,
    impersonatedByUserUuid,
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
      this.sendCancellationEmail(attendeeToRemove, evt);
    }

    const organizationId = user.organizationId ?? null;
    const isBookingAuditEnabled = organizationId
      ? await this.deps.featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit")
      : false;

    const auditContext: BookingAuditContext = {
      impersonatedBy: impersonatedByUserUuid ?? undefined,
    };

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
      context: auditContext,
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

  private async sendCancellationEmail(
    attendeeToRemove: Booking["attendees"][number],
    evt: CalendarEvent
  ): Promise<void> {
    try {
      const removedAttendeePerson = await this.prepareAttendeePerson(attendeeToRemove);
      const email = new AttendeeCancelledEmail(evt, removedAttendeePerson);
      await email.sendEmail();
    } catch (error) {
      logger.error("Failed to send cancellation email to removed attendee", {
        errorName: error instanceof Error ? error.name : "unknown_error",
      });
    }
  }
}
