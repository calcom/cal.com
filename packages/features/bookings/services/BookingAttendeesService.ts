import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { getFeaturesRepository } from "@calcom/features/di/containers/FeaturesRepository";
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
