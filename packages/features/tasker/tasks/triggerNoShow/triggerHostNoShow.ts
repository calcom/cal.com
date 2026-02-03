import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { Booking } from "./common";
import { calculateMaxStartTime, sendWebhookPayload, prepareNoShowTrigger, log } from "./common";

const markHostsAsNoShowInBooking = async (booking: Booking, hostsThatDidntJoinTheCall: Host[]) => {
  try {
    let noShowHost = booking.noShowHost;
    await Promise.allSettled(
      hostsThatDidntJoinTheCall.map((host) => {
        if (booking?.user?.id === host.id) {
          noShowHost = true;
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
    const updatedAttendees = await prisma.attendee.findMany({ where: { bookingId: booking.id } });
    return { noShowHost, attendees: updatedAttendees };
  } catch (error) {
    log.error("Error marking hosts as no show in booking", error);
    return null;
  }
};

export async function triggerHostNoShow(payload: string): Promise<void> {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;

  const { booking, webhook, hostsThatDidntJoinTheCall, originalRescheduledBooking, participants } = result;

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  const updatedData = await markHostsAsNoShowInBooking(booking, hostsThatDidntJoinTheCall);
  const bookingWithUpdatedData = updatedData
    ? { ...booking, noShowHost: updatedData.noShowHost, attendees: updatedData.attendees }
    : booking;

  const hostsNoShowPromises = hostsThatDidntJoinTheCall.map((host) => {
    return sendWebhookPayload(
      webhook,
      WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      bookingWithUpdatedData,
      maxStartTime,
      participants,
      originalRescheduledBooking,
      host.email
    );
  });

  await Promise.all(hostsNoShowPromises);
}
