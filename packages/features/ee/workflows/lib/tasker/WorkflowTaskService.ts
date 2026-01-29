import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type { ExtendedCalendarEvent } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { Workflow } from "@calcom/ee/workflows/lib/types";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import type { WorkflowAsyncTasksPayload, WorkflowTasks } from "./types";

export interface IWorkflowTaskServiceDependencies {
  bookingRepository: BookingRepository;
}

type EventTypeForWorkflows = {
  id: number;
  teamId: number | null;
  userId: number | null;
  parentId: number | null;
  metadata: unknown;
};

export class WorkflowTaskService implements WorkflowTasks {
  constructor(
    public readonly dependencies: { logger: ITaskerDependencies["logger"] } & IWorkflowTaskServiceDependencies
  ) {}

  private async _getVerifiedBookingData(payload: WorkflowAsyncTasksPayload) {
    const { bookingId } = payload;
    const { bookingRepository } = this.dependencies;

    const booking = await bookingRepository.getBookingForWorkflowTasker(bookingId);
    if (!booking) {
      throw new Error(`Booking with id '${bookingId}' was not found.`);
    }
    if (!booking.eventType) {
      throw new Error(`EventType of Booking with id '${bookingId}' was not found.`);
    }
    if (!booking.user) {
      throw new Error(`User of Booking with id '${bookingId}' was not found.`);
    }

        const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, {})).build();
        if (!calendarEvent) {
          throw new Error(`CalendarEvent could not be built from Booking with id '${bookingId}'.`);
        }
        if (!calendarEvent.bookerUrl) {
          throw new Error(`CalendarEvent bookerUrl is missing for Booking with id '${bookingId}'.`);
        }

        const extendedCalendarEvent: ExtendedCalendarEvent = {
          ...calendarEvent,
          bookerUrl: calendarEvent.bookerUrl,
          eventType: {
            slug: booking.eventType.slug,
            schedulingType: booking.eventType.schedulingType,
            hosts: booking.eventType.hosts?.map((host) => ({
              user: {
                email: host.user.email,
                destinationCalendar: host.user.destinationCalendar
                  ? { primaryEmail: host.user.destinationCalendar.primaryEmail }
                  : null,
              },
            })),
          },
        };

    const eventTypeForWorkflows: EventTypeForWorkflows = {
      id: booking.eventType.id,
      teamId: booking.eventType.teamId,
      userId: booking.eventType.userId,
      parentId: booking.eventType.parentId,
      metadata: booking.eventType.metadata,
    };

    return {
      booking,
      eventType: eventTypeForWorkflows,
      calendarEvent: extendedCalendarEvent,
      organizerId: booking.user.id,
    };
  }

  private async _getWorkflowsForEventType(
    eventType: EventTypeForWorkflows,
    organizerId: number
  ): Promise<Workflow[]> {
    return getAllWorkflowsFromEventType(
      {
        ...eventType,
        metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
      },
      organizerId
    );
  }

  async scheduleRescheduleWorkflows(payload: WorkflowAsyncTasksPayload) {
    const { booking, eventType, calendarEvent, organizerId } = await this._getVerifiedBookingData(payload);

    const workflows = await this._getWorkflowsForEventType(eventType, organizerId);

    const rescheduleWorkflows = workflows.filter(
      (workflow) =>
        workflow.trigger === WorkflowTriggerEvents.RESCHEDULE_EVENT ||
        workflow.trigger === WorkflowTriggerEvents.BEFORE_EVENT ||
        workflow.trigger === WorkflowTriggerEvents.AFTER_EVENT
    );

    if (rescheduleWorkflows.length === 0) {
      this.dependencies.logger.info(
        `No reschedule workflows found for booking ${booking.id}, skipping workflow scheduling`
      );
      return;
    }

    const creditService = new CreditService();

    await scheduleWorkflowReminders({
      workflows: rescheduleWorkflows,
      smsReminderNumber: payload.smsReminderNumber,
      calendarEvent,
      hideBranding: payload.hideBranding,
      seatReferenceUid: payload.seatReferenceUid,
      creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
    });
  }
}
