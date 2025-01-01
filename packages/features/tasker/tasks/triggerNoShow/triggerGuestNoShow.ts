import { processWorkflowStep } from "@calcom/ee/workflows/lib/processWorkflowStep";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { calculateMaxStartTime, sendWebhookPayload, prepareNoShowTrigger, log } from "./common";
import type { Host } from "./common";

const markAllGuestNoshowInBooking = async ({
  bookingId,
  hostsThatJoinedTheCall,
}: {
  bookingId: number;
  hostsThatJoinedTheCall: Host[];
}) => {
  try {
    const hostsThatJoinedTheCallEmails = hostsThatJoinedTheCall.map((h) => h.email);

    await prisma.attendee.updateMany({
      where: {
        bookingId,
        email: { notIn: hostsThatJoinedTheCallEmails },
      },
      data: { noShow: true },
    });
  } catch (err) {
    log.error("Error marking guests as no show in booking", err);
  }
};

export async function triggerGuestNoShow(payload: string): Promise<void> {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;

  const {
    webhook,
    booking,
    hostsThatJoinedTheCall,
    didGuestJoinTheCall,
    originalRescheduledBooking,
    participants,
  } = result;

  if (webhook) {
    const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

    if (!didGuestJoinTheCall) {
      await sendWebhookPayload(
        webhook,
        WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        booking,
        maxStartTime,
        participants,
        originalRescheduledBooking
      );

      await markAllGuestNoshowInBooking({ bookingId: booking.id, hostsThatJoinedTheCall });
    }
  }
}

export const triggerGuestNoShowWorkflow = async (payload: string): Promise<void> => {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;

  const { workflow } = result;

  if (workflow) {
    if (
      workflow.steps.length === 0 ||
      workflow.trigger !== WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
    )
      return;

    for (const step of workflow.steps) {
      if (!result?.calendarEvent) {
        continue;
      }
      await processWorkflowStep(workflow, step, {
        calendarEvent: result?.calendarEvent,
        emailAttendeeSendToOverride: result?.emailAttendeeSendToOverride,
        smsReminderNumber: result?.smsReminderNumber ?? null,
        hideBranding: result?.hideBranding,
        seatReferenceUid: result?.seatReferenceUid,
      });
    }
  }
};
