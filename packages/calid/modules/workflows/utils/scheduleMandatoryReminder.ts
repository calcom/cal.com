import type { getEventTypeResponse } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { getDefaultEvent } from "@calcom/lib/defaultEvents";
import logger from "@calcom/lib/logger";
import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

import type { CalIdWorkflow } from "../config/types";
import { scheduleEmailReminder } from "../managers/emailManager";
import type { ExtendedCalendarEvent } from "./reminderScheduler";

const logInstance = logger.getSubLogger({ prefix: ["[scheduleMandatoryReminder]"] });

export type NewBookingEventType = Awaited<ReturnType<typeof getDefaultEvent>> | getEventTypeResponse;

export async function scheduleMandatoryReminder(
  calendarEvent: ExtendedCalendarEvent,
  workflowList: CalIdWorkflow[],
  needsConfirmation: boolean,
  brandingHidden: boolean,
  seatReference: string | undefined,
  platformEmailDisabled = false
) {
  if (platformEmailDisabled) return;

  const executeReminderScheduling = async () => {
    const existingWorkflowFound = workflowList.find((workflowItem) => {
      const isBeforeEventTrigger = workflowItem.trigger === WorkflowTriggerEvents.BEFORE_EVENT;
      const hasValidTimeConstraints =
        (workflowItem.time !== null && workflowItem.time <= 12 && workflowItem.timeUnit === TimeUnit.HOUR) ||
        (workflowItem.time !== null && workflowItem.time <= 720 && workflowItem.timeUnit === TimeUnit.MINUTE);
      const containsEmailAction = workflowItem.steps.find(
        (stepItem) => stepItem?.action === WorkflowActions.EMAIL_ATTENDEE
      );

      return isBeforeEventTrigger && hasValidTimeConstraints && !!containsEmailAction;
    });

    const shouldCreateReminder = !existingWorkflowFound && !needsConfirmation;

    if (shouldCreateReminder) {
      const attendeeList = calendarEvent.attendees;

      const reminderConfiguration = {
        evt: calendarEvent,
        triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
        action: WorkflowActions.EMAIL_ATTENDEE,
        timeSpan: {
          time: 1,
          timeUnit: TimeUnit.HOUR,
        },
        sendTo: attendeeList,
        template: WorkflowTemplates.REMINDER,
        hideBranding: brandingHidden,
        seatReferenceUid: seatReference,
        includeCalendarEvent: false,
        isMandatoryReminder: true,
      };
      await scheduleEmailReminder(reminderConfiguration);
    }
  };

  try {
    await executeReminderScheduling();
  } catch (schedulingError) {
    logInstance.error(
      "Error while scheduling mandatory reminders",
      JSON.stringify({ error: schedulingError })
    );
  }
}
