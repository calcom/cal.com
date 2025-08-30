import type { getEventTypeResponse } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { scheduleEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { getDefaultEvent } from "@calcom/lib/defaultEvents";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

import type { ExtendedCalendarEvent } from "./reminderScheduler";

const log = logger.getSubLogger({ prefix: ["[scheduleMandatoryReminder]"] });

export type NewBookingEventType = Awaited<ReturnType<typeof getDefaultEvent>> | getEventTypeResponse;

async function _scheduleMandatoryReminder({
  evt,
  workflows,
  requiresConfirmation,
  hideBranding,
  seatReferenceUid,
  isPlatformNoEmail = false,
  isDryRun = false,
}: {
  evt: ExtendedCalendarEvent;
  workflows: Workflow[];
  requiresConfirmation: boolean;
  hideBranding: boolean;
  seatReferenceUid: string | undefined;
  isPlatformNoEmail?: boolean;
  isDryRun?: boolean;
}) {
  if (isDryRun) return;
  if (isPlatformNoEmail) return;
  try {
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
          sendTo: filteredAttendees.map((attendee) => attendee.email),
          template: WorkflowTemplates.REMINDER,
          hideBranding,
          seatReferenceUid,
          includeCalendarEvent: false,
          isMandatoryReminder: true,
          // Template is fixed so we don't have to verify
          verifiedAt: new Date(),
          userId: evt.organizer.id,
        });
      } catch (error) {
        log.error("Error while scheduling mandatory reminders", JSON.stringify({ error }));
      }
    }
  } catch (error) {
    log.error("Error while scheduling mandatory reminders", JSON.stringify({ error }));
  }
}

export const scheduleMandatoryReminder = withReporting(
  _scheduleMandatoryReminder,
  "scheduleMandatoryReminder"
);
