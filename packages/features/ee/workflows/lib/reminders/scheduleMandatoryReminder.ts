import type { Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";

import type { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking";
import { scheduleEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import type { BookingInfo } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import type { getDefaultEvent } from "@calcom/lib/defaultEvents";
import logger from "@calcom/lib/logger";
import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[scheduleMandatoryReminder]"] });

export type NewBookingEventType =
  | Awaited<ReturnType<typeof getDefaultEvent>>
  | Awaited<ReturnType<typeof getEventTypesFromDB>>;

export async function scheduleMandatoryReminder(
  evt: BookingInfo,
  workflows: (WorkflowsOnEventTypes & {
    workflow: Workflow & {
      steps: WorkflowStep[];
    };
  })[],
  requiresConfirmation: boolean,
  hideBranding: boolean,
  seatReferenceUid: string | undefined
) {
  try {
    const hasExistingWorkflow = workflows.some((workflow) => {
      return (
        workflow.workflow?.trigger === WorkflowTriggerEvents.BEFORE_EVENT &&
        ((workflow.workflow.time !== null &&
          workflow.workflow.time <= 12 &&
          workflow.workflow?.timeUnit === TimeUnit.HOUR) ||
          (workflow.workflow.time !== null &&
            workflow.workflow.time <= 720 &&
            workflow.workflow?.timeUnit === TimeUnit.MINUTE)) &&
        workflow.workflow?.steps.some((step) => step?.action === WorkflowActions.EMAIL_ATTENDEE)
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
