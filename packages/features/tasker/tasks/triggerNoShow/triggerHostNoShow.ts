import { makeSystemActor } from "@calcom/features/booking-audit/lib/makeActor";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { Booking } from "./common";
import { calculateMaxStartTime, log, prepareNoShowTrigger, sendWebhookPayload } from "./common";

const markHostsAsNoShowInBooking = async (booking: Booking, hostsThatDidntJoinTheCall: Host[]) => {
  try {
    let noShowHost = booking.noShowHost;
    const noShowHostAudit: { old: boolean | null; new: boolean | null } = {
      old: booking.noShowHost,
      new: null,
    };
    const attendeesNoShowHostMap = new Map<
      number,
      {
        old: boolean | null;
        new: boolean;
      }
    >();
    await Promise.allSettled(
      hostsThatDidntJoinTheCall.map(async (host) => {
        if (booking?.user?.id === host.id) {
          noShowHost = true;
          noShowHostAudit.new = noShowHost;
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
          const attendee = await prisma.attendee.findUnique({
            where: {
              id: host.id,
            },
          });
          if (!attendee) {
            log.error("Attendee not found for host", safeStringify(host));
            throw new Error("Attendee not found for host");
          }
          const currentAttendeeNoShow = attendee?.noShow;

          await prisma.attendee.update({
            where: { id: attendee.id },
            data: { noShow: true },
          });
          attendeesNoShowHostMap.set(attendee.id, { old: currentAttendeeNoShow ?? null, new: true });
        }
        return Promise.resolve();
      })
    );
    const updatedAttendees = await prisma.attendee.findMany({ where: { bookingId: booking.id } });

    try {
      const orgId = await getOrgIdFromMemberOrTeamId({
        memberId: booking.user?.id,
        teamId: booking.eventType?.teamId,
      });

      const bookingEventHandlerService = getBookingEventHandlerService();
      await bookingEventHandlerService.onNoShowUpdated({
        bookingUid: booking.uid,
        actor: makeSystemActor(),
        organizationId: orgId ?? null,
        source: "SYSTEM",
        auditData: {
          // Set hostNoShow only when it was updated in DB
          ...(noShowHostAudit.new
            ? { hostNoShow: { old: noShowHostAudit.old, new: noShowHostAudit.new } }
            : {}),
          attendeesNoShow: Object.fromEntries(attendeesNoShowHostMap),
        },
      });
    } catch (error) {
      log.error("Error logging audit for automatic host no-show", error);
    }

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
