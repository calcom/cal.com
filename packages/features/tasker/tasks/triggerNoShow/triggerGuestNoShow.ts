import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import {
  calculateMaxStartTime,
  fireNoShowUpdatedEvent,
  log,
  prepareNoShowTrigger,
  sendWebhookPayload,
} from "./common";

type UpdatedAttendee = {
  id: number;
  email: string;
  name: string;
  locale: string | null;
  timeZone: string;
  phoneNumber: string | null;
  bookingId: number | null;
  noShow: boolean | null;
};

const markGuestAsNoshowInBooking = async ({
  bookingId,
  hostsThatJoinedTheCall,
  guestsThatDidntJoinTheCall,
}: {
  bookingId: number;
  hostsThatJoinedTheCall: Host[];
  guestsThatDidntJoinTheCall?: { email: string; name: string }[];
}): Promise<{
  updatedAttendees: UpdatedAttendee[] | null;
  attendeesMarkedNoShow: { email: string; noShow: boolean; previousNoShow: boolean | null }[];
}> => {
  const attendeeRepository = new AttendeeRepository(prisma);

  try {
    // Get attendees before update to capture previous noShow values
    const attendeesBefore = await attendeeRepository.findByBookingId(bookingId);
    const attendeesBeforeMap = new Map(attendeesBefore.map((a) => [a.email, a]));

    let updatedAttendeeEmails: string[];
    if (guestsThatDidntJoinTheCall && guestsThatDidntJoinTheCall.length > 0) {
      const emailsToUpdate = guestsThatDidntJoinTheCall.map((g) => g.email);
      await attendeeRepository.updateManyNoShowByBookingIdAndEmails({
        where: { bookingId, emails: emailsToUpdate },
        data: { noShow: true },
      });
      updatedAttendeeEmails = emailsToUpdate;
    } else {
      const hostsThatJoinedTheCallEmails = hostsThatJoinedTheCall.map((h) => h.email);
      await attendeeRepository.updateManyNoShowByBookingIdExcludingEmails({
        where: { bookingId, excludeEmails: hostsThatJoinedTheCallEmails },
        data: { noShow: true },
      });
      // TODO: It is possible that by the time the updateMany query runs, there were more attendees added, though it would be a rare/unexpected thing because triggerGuestNoShow is called after the meeting has ended, and after that time attendees aren't updated
      updatedAttendeeEmails = attendeesBefore
        .filter((a) => !hostsThatJoinedTheCallEmails.includes(a.email))
        .map((a) => a.email);
    }

    const updatedAttendees = await attendeeRepository.findByBookingId(bookingId);

    const attendeesMarkedNoShow = updatedAttendeeEmails
      .map((email) => {
        const before = attendeesBeforeMap.get(email);
        if (!before) {
          return null;
        }
        return { email, noShow: true, previousNoShow: before.noShow };
      })
      .filter((a): a is { email: string; noShow: boolean; previousNoShow: boolean | null } => a !== null);

    return { updatedAttendees, attendeesMarkedNoShow };
  } catch (err) {
    log.error("Error marking guests as no show in booking", err);
    return { updatedAttendees: null, attendeesMarkedNoShow: [] };
  }
};

export async function triggerGuestNoShow(payload: string): Promise<void> {
  const result = await prepareNoShowTrigger(payload);
  if (!result) return;
  const {
    webhook,
    booking,
    hosts,
    hostsThatJoinedTheCall,
    didGuestJoinTheCall,
    guestsThatDidntJoinTheCall,
    originalRescheduledBooking,
    participants,
  } = result;

  const hostEmails = new Set(hosts.map((h) => h.email));

  const maxStartTime = calculateMaxStartTime(booking.startTime, webhook.time, webhook.timeUnit);

  const requireEmailForGuests = booking.eventType?.calVideoSettings?.requireEmailForGuests ?? false;

  if (requireEmailForGuests) {
    if (guestsThatDidntJoinTheCall.length > 0) {
      const { updatedAttendees, attendeesMarkedNoShow } = await markGuestAsNoshowInBooking({
        bookingId: booking.id,
        hostsThatJoinedTheCall,
        guestsThatDidntJoinTheCall,
      });

      const attendeesNoShowAudit = attendeesMarkedNoShow.map((a) => ({
        attendeeEmail: a.email,
        noShow: { old: a.previousNoShow, new: a.noShow },
      }));
      await fireNoShowUpdatedEvent({ booking, attendeesNoShowAudit });

      const guests = updatedAttendees?.filter((a) => !hostEmails.has(a.email)) ?? [];
      const bookingWithUpdatedData = updatedAttendees
        ? { ...booking, attendees: updatedAttendees, guests }
        : booking;

      await sendWebhookPayload(
        webhook,
        WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        bookingWithUpdatedData,
        maxStartTime,
        participants,
        originalRescheduledBooking
      );
    }
  } else {
    if (!didGuestJoinTheCall) {
      const { updatedAttendees, attendeesMarkedNoShow } = await markGuestAsNoshowInBooking({
        bookingId: booking.id,
        hostsThatJoinedTheCall,
      });

      const attendeesNoShowAudit = attendeesMarkedNoShow.map((a) => ({
        attendeeEmail: a.email,
        noShow: { old: a.previousNoShow, new: a.noShow },
      }));
      await fireNoShowUpdatedEvent({ booking, attendeesNoShowAudit });

      const guests = updatedAttendees?.filter((a) => !hostEmails.has(a.email)) ?? [];

      const bookingWithUpdatedData = updatedAttendees
        ? { ...booking, attendees: updatedAttendees, guests }
        : booking;

      await sendWebhookPayload(
        webhook,
        WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        bookingWithUpdatedData,
        maxStartTime,
        participants,
        originalRescheduledBooking
      );
    }
  }
}
