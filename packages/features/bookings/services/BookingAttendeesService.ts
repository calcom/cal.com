import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { getFeaturesRepository } from "@calcom/features/di/containers/FeaturesRepository";
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
import { TRPCError } from "@trpc/server";

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

export class BookingAttendeesService {
  async addAttendee({
    bookingId,
    attendee,
    user,
    emailsEnabled = true,
    actionSource,
  }: AddAttendeeInput): Promise<CreatedAttendee> {
    try {
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

      const bookingEventHandlerService = getBookingEventHandlerService();
      const featuresRepository = getFeaturesRepository();
      const organizationId = user.organizationId ?? null;
      const isBookingAuditEnabled = organizationId
        ? await featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit")
        : false;

      await bookingEventHandlerService.onAttendeeAdded({
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
        throw new ErrorWithCode(ErrorCode.InternalServerError, "Attendee was created but could not be found");
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
    } catch (error) {
      if (error instanceof TRPCError) {
        throw this.convertTRPCErrorToErrorWithCode(error);
      }
      throw error;
    }
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

  private convertTRPCErrorToErrorWithCode(error: TRPCError): ErrorWithCode {
    switch (error.code) {
      case "NOT_FOUND":
        return ErrorWithCode.Factory.NotFound(error.message);
      case "FORBIDDEN":
        return ErrorWithCode.Factory.Forbidden(error.message);
      case "BAD_REQUEST":
        return ErrorWithCode.Factory.BadRequest(error.message);
      case "INTERNAL_SERVER_ERROR":
        return ErrorWithCode.Factory.InternalServerError(error.message);
      default:
        return new ErrorWithCode(ErrorCode.InternalServerError, error.message);
    }
  }
}
