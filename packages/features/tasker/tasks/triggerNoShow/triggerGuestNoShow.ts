import { makeSystemActor } from "@calcom/features/booking-audit/lib/makeActor";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
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
  try {
    const attendeesBefore = await prisma.attendee.findMany({
      where: { bookingId },
      select: { id: true, email: true, noShow: true },
    });
    const attendeesBeforeMap = new Map(attendeesBefore.map((a) => [a.email, a]));

    let updateAttendeeEmails: string[];
    if (guestsThatDidntJoinTheCall && guestsThatDidntJoinTheCall.length > 0) {
      const emailsToUpdate = guestsThatDidntJoinTheCall.map((g) => g.email);
      await prisma.attendee.updateMany({
        where: {
          bookingId,
          email: { in: emailsToUpdate },
        },
        data: { noShow: true },
      });
      updateAttendeeEmails = emailsToUpdate;
    } else {
      const hostsThatJoinedTheCallEmails = hostsThatJoinedTheCall.map((h) => h.email);
      await prisma.attendee.updateMany({
        where: {
          bookingId,
          email: { notIn: hostsThatJoinedTheCallEmails },
        },
        data: { noShow: true },
      });
      // TODO: It is possible that by the time the updateMany query runs, there were more attendees added, though it would be a rare/unexpected thing because triggerGuestNoShow is called after the meeting has ended, and after that time attendees aren't updated
      updateAttendeeEmails = attendeesBefore
        .filter((a) => !hostsThatJoinedTheCallEmails.includes(a.email))
        .map((a) => a.email);
    }

    const updatedAttendees = await prisma.attendee.findMany({ where: { bookingId } });

    const attendeesMarkedNoShow = updateAttendeeEmails
      .map((email) => {
        const before = attendeesBeforeMap.get(email);
        if (!before) {
          // Ideally not possible because we fetched all attendees in attendeesBeforeMap
          return null;
        }
        return { id: before.id, noShow: true, previousNoShow: before.noShow };
      })
      .filter((a): a is { id: number; noShow: boolean; previousNoShow: boolean | null } => a !== null);

    return { updatedAttendees, attendeesMarkedNoShow };
  } catch (err) {
    log.error("Error marking guests as no show in booking", err);
    return { updatedAttendees: null, attendeesMarkedNoShow: [] };
  }
};

const fireNoShowUpdated = async (
  booking: {
    id: number;
    uid: string;
    user?: { id: number } | null;
    eventType?: { teamId?: number | null } | null;
  },
  attendeesMarkedNoShow: { id: number; noShow: boolean; previousNoShow: boolean | null }[]
): Promise<void> => {
  try {
    const orgId = await getOrgIdFromMemberOrTeamId({
      memberId: booking.user?.id,
      // We don't care about user events here, so managed event child aren't considered
      teamId: booking.eventType?.teamId,
    });

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

      if (attendeesMarkedNoShow.length > 0) {
        await fireNoShowUpdated(booking, attendeesMarkedNoShow);
      }

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

      if (attendeesMarkedNoShow.length > 0) {
        await fireNoShowUpdated(booking, attendeesMarkedNoShow);
      }

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

      if (attendeesMarkedNoShow.length > 0) {
        await fireNoShowUpdated(booking, attendeesMarkedNoShow);
      }
    }
  }
}
