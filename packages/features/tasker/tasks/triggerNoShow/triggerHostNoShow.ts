import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { Booking, Host } from "./common";
import { calculateMaxStartTime, sendWebhookPayload, prepareNoShowTrigger, log } from "./common";

const markHostsAsNoShowInBooking = async (booking: Booking, hostsThatDidntJoinTheCall: Host[]) => {
  try {
    await Promise.allSettled(
      hostsThatDidntJoinTheCall.map((host) => {
        if (booking?.user?.id === host.id) {
          return prisma.booking.update({
            where: {
              uid: booking.uid,
            },
            data: {
              noShowHost: true,
            },
          });
        }
        // If there are more than one host then it is stored in attendees table
        else if (booking.attendees?.some((attendee) => attendee.email === host.email)) {
          return prisma.attendee.update({
            where: { id: host.id },
            data: { noShow: true },
          });
        }
        return Promise.resolve();
      })
    );
  } catch (error) {
    log.error("Error marking hosts as no show in booking", error);
  }
};

export async function triggerHostNoShow(payload: string): Promise<void> {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;

  const { booking, webhook, hostsThatDidntJoinTheCall, originalRescheduledBooking, participants } = result;

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  const hostsNoShowPromises = hostsThatDidntJoinTheCall.map((host) => {
    return sendWebhookPayload(
      webhook,
      WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      booking,
      maxStartTime,
      participants,
      originalRescheduledBooking,
      host.email
    );
  });

  await Promise.all(hostsNoShowPromises);

  await markHostsAsNoShowInBooking(booking, hostsThatDidntJoinTheCall);
}
