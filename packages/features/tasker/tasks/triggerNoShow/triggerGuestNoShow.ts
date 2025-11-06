import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { calculateMaxStartTime, sendWebhookPayload, prepareNoShowTrigger, log } from "./common";

const markGuestAsNoshowInBooking = async ({
  bookingId,
  hostsThatJoinedTheCall,
  guestsThatDidntJoinTheCall,
}: {
  bookingId: number;
  hostsThatJoinedTheCall: Host[];
  guestsThatDidntJoinTheCall?: { email: string; name: string }[];
}) => {
  try {
    if (guestsThatDidntJoinTheCall && guestsThatDidntJoinTheCall.length > 0) {
      const guestEmailsThatDidntJoin = guestsThatDidntJoinTheCall.map((g) => g.email);
      await prisma.attendee.updateMany({
        where: {
          bookingId,
          email: { in: guestEmailsThatDidntJoin },
        },
        data: { noShow: true },
      });
    } else {
      const hostsThatJoinedTheCallEmails = hostsThatJoinedTheCall.map((h) => h.email);
      await prisma.attendee.updateMany({
        where: {
          bookingId,
          email: { notIn: hostsThatJoinedTheCallEmails },
        },
        data: { noShow: true },
      });
    }
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
    guestsThatDidntJoinTheCall,
    originalRescheduledBooking,
    participants,
  } = result;

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  const requireEmailForGuests = booking.eventType?.calVideoSettings?.requireEmailForGuests ?? false;

  if (requireEmailForGuests) {
    if (guestsThatDidntJoinTheCall.length > 0) {
      await Promise.all([
        sendWebhookPayload(
          webhook,
          WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
          booking,
          maxStartTime,
          participants,
          originalRescheduledBooking
        ),
        markGuestAsNoshowInBooking({
          bookingId: booking.id,
          hostsThatJoinedTheCall,
          guestsThatDidntJoinTheCall,
        }),
      ]);
    }
  } else {
    if (!didGuestJoinTheCall) {
      await Promise.all([
        sendWebhookPayload(
          webhook,
          WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
          booking,
          maxStartTime,
          participants,
          originalRescheduledBooking
        ),
        markGuestAsNoshowInBooking({ bookingId: booking.id, hostsThatJoinedTheCall }),
      ]);
    }
  }
}
