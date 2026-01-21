import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { Booking } from "./common";
import {
  calculateMaxStartTime,
  fireNoShowUpdatedEvent,
  log,
  prepareNoShowTrigger,
  sendWebhookPayload,
} from "./common";

const markHostsAsNoShowInBooking = async (booking: Booking, hostsThatDidntJoinTheCall: Host[]) => {
  const bookingRepository = new BookingRepository(prisma);
  const attendeeRepository = new AttendeeRepository(prisma);

  try {
    if (hostsThatDidntJoinTheCall.length === 0) {
      return null;
    }

    let noShowHost = booking.noShowHost;
    const noShowHostAudit: { old: boolean | null; new: boolean | null } = {
      old: booking.noShowHost,
      new: null,
    };
    const attendeesNoShowAudit = new Map<
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
          return bookingRepository.updateNoShowHost({ bookingUid: booking.uid, noShowHost: true });
        }
        // If there are more than one host then it is stored in attendees table
        else if (booking.attendees?.some((attendee) => attendee.email === host.email)) {
          const attendee = await attendeeRepository.findByIdWithNoShow(host.id);
          if (!attendee) {
            log.error("Attendee not found for host", safeStringify(host));
            throw new Error("Attendee not found for host");
          }
          const currentAttendeeNoShow = attendee.noShow;

          await attendeeRepository.updateNoShow({ attendeeId: attendee.id, noShow: true });
          attendeesNoShowAudit.set(attendee.id, { old: currentAttendeeNoShow ?? null, new: true });
        }
        return Promise.resolve();
      })
    );
    const updatedAttendees = await attendeeRepository.findByBookingIdWithDetails(booking.id);

    await fireNoShowUpdatedEvent({
      booking,
      noShowHostAudit,
      attendeesNoShowAudit,
    });

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
