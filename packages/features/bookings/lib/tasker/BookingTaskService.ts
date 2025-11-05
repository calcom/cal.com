import { getOriginalRescheduledBooking } from "bookings/lib/handleNewBooking/originalRescheduledBookingUtils";

import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import { JsonObject } from "@calcom/types/Json";

import { BookingTasks } from "./types";

export interface IBookingTaskServiceDependencies {
  emailsAndSmsHandler: BookingEmailSmsHandler;
  bookingRepository: BookingRepository;
}

export class BookingTaskService implements BookingTasks {
  constructor(
    public readonly dependencies: { logger: ITaskerDependencies["logger"] } & IBookingTaskServiceDependencies
  ) {}

  async request(payload: Parameters<BookingTasks["request"]>[0]) {
    const { bookingId, ...bookingMeta } = payload;

    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: this.dependencies.logger });
    const booking = await this.dependencies.bookingRepository.getBookingForCalEventBuilder(bookingId);
    if (booking) {
      const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, bookingMeta)).build();
      if (calendarEvent) {
        await emailsAndSmsHandler.send({
          action: "BOOKING_REQUESTED",
          data: {
            evt: calendarEvent,
            attendees: calendarEvent.attendees,
            eventType: {
              schedulingType: booking.eventType?.schedulingType ?? null,
              metadata: (booking.eventType?.metadata as object) ?? null,
            },
            additionalNotes: calendarEvent.additionalNotes,
          },
        });
      }
    }
  }

  async confirm(payload: Parameters<BookingTasks["confirm"]>[0]) {
    const { bookingId, ...bookingMeta } = payload;
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: this.dependencies.logger });

    const booking = await this.dependencies.bookingRepository.getBookingForCalEventBuilder(bookingId);
    if (booking && booking.eventType) {
      const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, bookingMeta)).build();
      const attendeesEmail = booking.attendees.map((attendee) => attendee.email);
      const bookedTeamMembers = booking.eventType.team
        ? booking.eventType.team.members.filter((teamUser) => attendeesEmail.includes(teamUser.user.email))
        : [];
      if (calendarEvent) {
        const eventNameObject = {
          attendeeName: calendarEvent.organizer.name || "Nameless",
          eventType: booking.eventType.title,
          eventName: booking.eventType.eventName,
          // we send on behalf of team if >1 round robin attendee | collective
          teamName:
            booking.eventType.schedulingType === "COLLECTIVE" || bookedTeamMembers.length > 1
              ? booking.eventType.team?.name
              : null,
          host: calendarEvent.organizer.name || "Nameless",
          location: booking.location,
          eventDuration: dayjs(booking.endTime).diff(booking.startTime, "minutes"),
          bookingFields: booking.eventType.bookingFields as JsonObject,
          t: calendarEvent.organizer.language.translate,
        };
        const workflows = await getAllWorkflowsFromEventType(
          {
            ...booking.eventType,
            metadata: eventTypeMetaDataSchemaWithTypedApps.parse(booking.eventType.metadata),
          },
          calendarEvent.organizer.id
        );
        await emailsAndSmsHandler.send({
          action: "BOOKING_CONFIRMED",
          data: {
            eventType: {
              schedulingType: booking.eventType?.schedulingType ?? null,
              metadata: (booking.eventType?.metadata as object) ?? null,
            },
            eventNameObject,
            workflows: workflows,
            evt: calendarEvent,
            additionalInformation: calendarEvent.additionalInformation ?? {},
            additionalNotes: calendarEvent.additionalNotes,
            customInputs: calendarEvent.customInputs,
          },
        });
      }
    }
  }

  async reschedule(payload: Parameters<BookingTasks["reschedule"]>[0]) {
    const { bookingId, ...bookingMeta } = payload;
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: this.dependencies.logger });
    const booking = await this.dependencies.bookingRepository.getBookingForCalEventBuilder(bookingId);
    if (booking) {
      const originalBookingData = await getOriginalRescheduledBooking(
        booking.uid,
        !!booking.eventType?.seatsPerTimeSlot
      );
      const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, bookingMeta)).build();

      if (calendarEvent) {
        await emailsAndSmsHandler.send({
          action: "BOOKING_RESCHEDULED",
          data: {
            evt: calendarEvent,
            eventType: {
              schedulingType: booking.eventType?.schedulingType ?? null,
              metadata: (booking.eventType?.metadata as object) ?? null,
            },
            additionalInformation: calendarEvent.additionalInformation ?? {},
            additionalNotes: calendarEvent.additionalNotes,
            iCalUID: calendarEvent.iCalUID ?? "",
            originalRescheduledBooking: originalBookingData,
            rescheduleReason: (calendarEvent?.responses?.["rescheduleReason"]?.value as string) ?? undefined,
            users: booking.eventType?.hosts.map((h) => h.user) ?? [],
            changedOrganizer: true,
            isRescheduledByBooker: true,
          },
        });
      }
    }
  }

  async rrReschedule(payload: Parameters<BookingTasks["rrReschedule"]>[0]) {
    const { bookingId, ...bookingMeta } = payload;
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: this.dependencies.logger });
    const booking = await this.dependencies.bookingRepository.getBookingForCalEventBuilder(bookingId);
    if (booking) {
      const originalBookingData = await getOriginalRescheduledBooking(
        booking.uid,
        !!booking.eventType?.seatsPerTimeSlot
      );
      const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, bookingMeta)).build();

      if (calendarEvent) {
        await emailsAndSmsHandler.send({
          action: "BOOKING_RESCHEDULED",
          data: {
            evt: calendarEvent,
            eventType: {
              schedulingType: booking.eventType?.schedulingType ?? null,
              metadata: (booking.eventType?.metadata as object) ?? null,
            },
            additionalInformation: calendarEvent.additionalInformation ?? {},
            additionalNotes: calendarEvent.additionalNotes,
            iCalUID: calendarEvent.iCalUID ?? "",
            originalRescheduledBooking: originalBookingData,
            rescheduleReason: (calendarEvent?.responses?.["rescheduleReason"]?.value as string) ?? undefined,
            users: booking.eventType?.hosts.map((h) => h.user) ?? [],
            changedOrganizer: true,
            isRescheduledByBooker: true,
          },
        });
      }
    }
  }
}
