import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import type { WorkflowStep } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { scheduleBookingReminders } from "./scheduleBookingReminders";

/**
 * Schedule workflow notifications for bookings.
 * This is used when a workflow is created/updated to schedule reminders for existing bookings.
 */
export async function scheduleWorkflowNotifications({
  activeOn,
  isOrg,
  workflowSteps,
  time,
  timeUnit,
  trigger,
  userId,
  teamId,
  alreadyScheduledActiveOnIds,
}: {
  activeOn: number[];
  isOrg: boolean;
  workflowSteps: Partial<WorkflowStep>[];
  time: number | null;
  timeUnit: TimeUnit | null;
  trigger: WorkflowTriggerEvents;
  userId: number;
  teamId: number | null;
  alreadyScheduledActiveOnIds?: number[];
}) {
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT) return;

  const bookingsToScheduleNotifications = await WorkflowRepository.getBookingsForWorkflowReminders({
    activeOn,
    isOrg,
    alreadyScheduledActiveOnIds,
  });

  await scheduleBookingReminders(
    bookingsToScheduleNotifications,
    workflowSteps,
    time,
    timeUnit,
    trigger,
    userId,
    teamId,
    isOrg
  );
}
