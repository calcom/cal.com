import type { Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";

import type { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking";
import { scheduleEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { SENDER_NAME } from "@calcom/lib/constants";
import type { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

export type NewBookingEventType =
  | Awaited<ReturnType<typeof getDefaultEvent>>
  | Awaited<ReturnType<typeof getEventTypesFromDB>>;

export async function scheduleMandatoryReminder(
  evt: CalendarEvent,
  workflows: (WorkflowsOnEventTypes & {
    workflow: Workflow & {
      steps: WorkflowStep[];
    };
  })[],
  requiresConfirmation: boolean,
  slug: string,
  metadataFromEvent:
    | {
        videoCallUrl: string;
      }
    | undefined
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

        await scheduleEmailReminder(
          {
            ...evt,
            ...{ metadata: metadataFromEvent, eventType: { slug } },
          },
          WorkflowTriggerEvents.BEFORE_EVENT,
          WorkflowActions.EMAIL_ATTENDEE,
          {
            time: 1,
            timeUnit: TimeUnit.HOUR,
          },
          filteredAttendees,
          "",
          "",
          WorkflowTemplates.REMINDER,
          SENDER_NAME,
          undefined,
          false,
          evt.attendeeSeatId,
          false,
          true
        );
      } catch (error) {
        console.error("Error while scheduling mandatory reminders", JSON.stringify({ error }));
      }
    }
  } catch (error) {
    console.error("Error while scheduling mandatory reminders", JSON.stringify({ error }));
  }
}
