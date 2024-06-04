import type { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking";
import { scheduleEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import type { BookingInfo } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { getDefaultEvent } from "@calcom/lib/defaultEvents";
import logger from "@calcom/lib/logger";
import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[scheduleMandatoryReminder]"] });

export type NewBookingEventType =
  | Awaited<ReturnType<typeof getDefaultEvent>>
  | Awaited<ReturnType<typeof getEventTypesFromDB>>;

export async function scheduleMandatoryReminder(
  evt: BookingInfo,
  workflows: Workflow[],
  requiresConfirmation: boolean,
  hideBranding: boolean,
  seatReferenceUid: string | undefined
) {
  try {
    // here we need to also check if maybe another org or team workflow exists
    const hasExistingWorkflow = workflows.some((workflow) => {
      return (
        workflow.trigger === WorkflowTriggerEvents.BEFORE_EVENT &&
        ((workflow.time !== null && workflow.time <= 12 && workflow.timeUnit === TimeUnit.HOUR) ||
          (workflow.time !== null && workflow.time <= 720 && workflow.timeUnit === TimeUnit.MINUTE)) &&
        workflow.steps.some((step) => step?.action === WorkflowActions.EMAIL_ATTENDEE)
      );
    });

    if (
      !hasExistingWorkflow &&
      evt.attendees.some((attendee) => attendee.email.includes("@gmail.com")) &&
      !requiresConfirmation
    ) {
      try {
        const filteredAttendees =
          evt.attendees?.filter((attendee) => attendee.email.includes("@gmail.com")) || [];

        await scheduleEmailReminder({
          evt,
          triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
          action: WorkflowActions.EMAIL_ATTENDEE,
          timeSpan: {
            time: 1,
            timeUnit: TimeUnit.HOUR,
          },
          sendTo: filteredAttendees,
          template: WorkflowTemplates.REMINDER,
          hideBranding,
          seatReferenceUid,
          includeCalendarEvent: false,
          isMandatoryReminder: true,
        });
      } catch (error) {
        log.error("Error while scheduling mandatory reminders", JSON.stringify({ error }));
      }
    }
  } catch (error) {
    log.error("Error while scheduling mandatory reminders", JSON.stringify({ error }));
  }
}
