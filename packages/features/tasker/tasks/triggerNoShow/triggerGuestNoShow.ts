import { makeSystemActor } from "@calcom/features/booking-audit/lib/makeActor";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { calculateMaxStartTime, log, prepareNoShowTrigger, sendWebhookPayload } from "./common";

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
  attendeesMarkedNoShow: { id: number; noShow: boolean; previousNoShow: boolean | null }[];
}> => {
  const attendeeRepository = new AttendeeRepository(prisma);

  try {
    // Get attendees before update to capture previous noShow values
    const attendeesBefore = await attendeeRepository.findByBookingId(bookingId);
    const attendeesBeforeMap = new Map(attendeesBefore.map((a) => [a.email, a]));

    let emailsToUpdate: string[];
    if (guestsThatDidntJoinTheCall && guestsThatDidntJoinTheCall.length > 0) {
      emailsToUpdate = guestsThatDidntJoinTheCall.map((g) => g.email);
      await attendeeRepository.updateManyNoShowByBookingIdAndEmails(bookingId, emailsToUpdate, true);
    } else {
      const hostsThatJoinedTheCallEmails = hostsThatJoinedTheCall.map((h) => h.email);
      emailsToUpdate = attendeesBefore
        .filter((a) => !hostsThatJoinedTheCallEmails.includes(a.email))
        .map((a) => a.email);
      await attendeeRepository.updateManyNoShowByBookingIdExcludingEmails(
        bookingId,
        hostsThatJoinedTheCallEmails,
        true
      );
    }

    // Fetch full attendee data after update for webhook payload
    const updatedAttendees = await attendeeRepository.findByBookingIdWithDetails(bookingId);

    // Build attendeesMarkedNoShow with previous values
    const attendeesMarkedNoShow = emailsToUpdate
      .map((email) => {
        const before = attendeesBeforeMap.get(email);
        if (!before) return null;
        return { id: before.id, noShow: true, previousNoShow: before.noShow };
      })
      .filter((a): a is { id: number; noShow: boolean; previousNoShow: boolean | null } => a !== null);

    return { updatedAttendees, attendeesMarkedNoShow };
  } catch (err) {
    log.error("Error marking guests as no show in booking", err);
    return { updatedAttendees: null, attendeesMarkedNoShow: [] };
  }
};

const logGuestNoShowAudit = async (
  booking: {
    id: number;
    uid: string;
    user?: { id: number } | null;
    eventType?: { teamId?: number | null } | null;
  },
  attendeesMarkedNoShow: { id: number; noShow: boolean; previousNoShow: boolean | null }[]
) => {
  try {
    const orgId = await getOrgIdFromMemberOrTeamId({
      memberId: booking.user?.id,
      teamId: booking.eventType?.teamId,
    });

    // Build attendeesNoShow record with attendee IDs as keys
    const attendeesNoShow: Record<number, { old: boolean | null; new: boolean }> = {};
    for (const attendee of attendeesMarkedNoShow) {
      attendeesNoShow[attendee.id] = { old: attendee.previousNoShow, new: attendee.noShow };
    }

    const bookingEventHandlerService = getBookingEventHandlerService();
    await bookingEventHandlerService.onNoShowUpdated({
      bookingUid: booking.uid,
      actor: makeSystemActor(),
      organizationId: orgId ?? null,
      source: "SYSTEM",
      auditData: {
        attendeesNoShow,
      },
    });
  } catch (error) {
    log.error("Error logging audit for automatic guest no-show", error);
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
      const { updatedAttendees, attendeesMarkedNoShow } = await markGuestAsNoshowInBooking({
        bookingId: booking.id,
        hostsThatJoinedTheCall,
        guestsThatDidntJoinTheCall,
      });

      // Use updated attendees for webhook payload (with noShow: true)
      const bookingWithUpdatedData = updatedAttendees
        ? { ...booking, attendees: updatedAttendees, guests: updatedAttendees }
        : booking;

      await sendWebhookPayload(
        webhook,
        WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        bookingWithUpdatedData,
        maxStartTime,
        participants,
        originalRescheduledBooking
      );

      if (attendeesMarkedNoShow.length > 0) {
        await logGuestNoShowAudit(booking, attendeesMarkedNoShow);
      }
    }
  } else {
    if (!didGuestJoinTheCall) {
      const { updatedAttendees, attendeesMarkedNoShow } = await markGuestAsNoshowInBooking({
        bookingId: booking.id,
        hostsThatJoinedTheCall,
      });

      // Use updated attendees for webhook payload (with noShow: true)
      const bookingWithUpdatedData = updatedAttendees
        ? { ...booking, attendees: updatedAttendees, guests: updatedAttendees }
        : booking;

      await sendWebhookPayload(
        webhook,
        WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        bookingWithUpdatedData,
        maxStartTime,
        participants,
        originalRescheduledBooking
      );

      if (attendeesMarkedNoShow.length > 0) {
        await logGuestNoShowAudit(booking, attendeesMarkedNoShow);
      }
    }
  }
}
