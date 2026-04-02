import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import type { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { getOriginalRescheduledBooking } from "@calcom/features/bookings/lib/handleNewBooking/originalRescheduledBookingUtils";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import type { EventNameObjectType } from "@calcom/features/eventtypes/lib/eventNaming";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { SchedulingType } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { JsonObject } from "@calcom/types/Json";
import type { BookingEmailAndSmsAsyncTasksPayload, BookingTasks } from "./types";

export interface IBookingTaskServiceDependencies {
  emailsAndSmsHandler: BookingEmailSmsHandler;
  bookingRepository: BookingRepository;
}

export class BookingEmailAndSmsTaskService implements BookingTasks {
  constructor(
    public readonly dependencies: { logger: ITaskerDependencies["logger"] } & IBookingTaskServiceDependencies
  ) {}

  private async _getVerifiedBookingData(payload: BookingEmailAndSmsAsyncTasksPayload) {
    const { bookingId, ...bookingMeta } = payload;
    const { bookingRepository } = this.dependencies;

    const booking = await bookingRepository.getBookingForCalEventBuilder(bookingId);
    if (!booking) {
      throw new Error(`Booking with id '${bookingId}' was not found.`);
    }
    if (!booking.eventType) {
      throw new Error(`EventType of Booking with id '${bookingId}' was not found.`);
    }

    const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, bookingMeta)).build();
    if (!calendarEvent) {
      throw new Error(`CalendarEvent could not be built from Booking with id '${bookingId}'.`);
    }

    return {
      booking: booking,
      eventType: booking.eventType,
      calendarEvent: calendarEvent as NonNullable<CalendarEvent>,
    };
  }

  async request(payload: Parameters<BookingTasks["request"]>[0]) {
    const { eventType, calendarEvent } = await this._getVerifiedBookingData(payload);

    await this.dependencies.emailsAndSmsHandler.send({
      action: "BOOKING_REQUESTED",
      data: {
        evt: calendarEvent,
        attendees: calendarEvent.attendees,
        eventType: {
          schedulingType: eventType.schedulingType ?? null,
          metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
        },
        additionalNotes: calendarEvent.additionalNotes,
      },
    });
  }

  async confirm(payload: Parameters<BookingTasks["confirm"]>[0]) {
    const { booking, eventType, calendarEvent } = await this._getVerifiedBookingData(payload);

    const attendeesEmail = booking.attendees.map((attendee) => attendee.email);
    const bookedTeamMembers = eventType.team
      ? eventType.team.members.filter((teamUser) => attendeesEmail.includes(teamUser.user.email))
      : [];

    const eventNameObject = {
      attendeeName: calendarEvent.organizer.name || "Nameless",
      eventType: eventType.title,
      eventName: eventType.eventName,
      // we send on behalf of team if >1 round robin attendee | collective
      teamName:
        eventType.schedulingType === "COLLECTIVE" || bookedTeamMembers.length > 1
          ? eventType.team?.name
          : null,
      host: calendarEvent.organizer.name || "Nameless",
      location: booking.location,
      eventDuration: dayjs(booking.endTime).diff(booking.startTime, "minutes"),
      bookingFields: eventType.bookingFields as JsonObject,
      t: calendarEvent.organizer.language.translate,
    } satisfies EventNameObjectType;

    const workflows = await getAllWorkflowsFromEventType(
      {
        ...eventType,
        metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
      },
      calendarEvent.organizer.id
    );

    await this.dependencies.emailsAndSmsHandler.send({
      action: "BOOKING_CONFIRMED",
      data: {
        eventType: {
          schedulingType: booking.eventType?.schedulingType ?? null,
          metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
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

  async reschedule(payload: Parameters<BookingTasks["reschedule"]>[0]) {
    const { booking, eventType, calendarEvent } = await this._getVerifiedBookingData(payload);

    const originalBookingData = await getOriginalRescheduledBooking(
      booking.uid,
      !!booking.eventType?.seatsPerTimeSlot
    );

    const changedOrganizer =
      !!originalBookingData &&
      (eventType.schedulingType === SchedulingType.ROUND_ROBIN ||
        eventType.schedulingType === SchedulingType.COLLECTIVE) &&
      originalBookingData.userId !== calendarEvent.organizer.id;

    await this.dependencies.emailsAndSmsHandler.send({
      action: "BOOKING_RESCHEDULED",
      data: {
        evt: calendarEvent,
        eventType: {
          schedulingType: eventType.schedulingType ?? null,
          metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
        },
        additionalInformation: calendarEvent.additionalInformation ?? {},
        additionalNotes: calendarEvent.additionalNotes,
        iCalUID: calendarEvent.iCalUID ?? "",
        originalRescheduledBooking: originalBookingData,
        rescheduleReason: (calendarEvent?.responses?.["rescheduleReason"]?.value as string) ?? undefined,
        users: eventType.hosts.map((h) => h.user) ?? [],
        changedOrganizer: changedOrganizer,
        isRescheduledByBooker: payload.isRescheduledByBooker ?? false,
      },
    });
  }

  async rrReschedule(payload: Parameters<BookingTasks["rrReschedule"]>[0]) {
    return this.reschedule(payload);
  }
}
