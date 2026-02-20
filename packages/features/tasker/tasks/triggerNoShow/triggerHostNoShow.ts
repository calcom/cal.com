import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { Workflow } from "@calcom/ee/workflows/lib/types";
import type { Host } from "@calcom/features/bookings/lib/getHostsAndGuests";
import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
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

    const attendeesBefore = await attendeeRepository.findByBookingId(booking.id);
    const attendeesBeforeByEmail = new Map(attendeesBefore.map((a) => [a.email, a]));

    let noShowHost = booking.noShowHost;
    const noShowHostAudit: { old: boolean | null; new: boolean | null } = {
      old: booking.noShowHost,
      new: null,
    };
    const attendeesNoShowAudit: Array<{
      attendeeEmail: string;
      noShow: { old: boolean | null; new: boolean };
    }> = [];
    await Promise.allSettled(
      hostsThatDidntJoinTheCall.map(async (host) => {
        if (booking?.user?.id === host.id) {
          noShowHost = true;
          noShowHostAudit.new = noShowHost;
          return bookingRepository.updateNoShowHost({ bookingUid: booking.uid, noShowHost: true });
        }
        // If there are more than one host then it is stored in attendees table
        const attendeeBefore = attendeesBeforeByEmail.get(host.email);
        if (attendeeBefore) {
          await attendeeRepository.updateNoShow({
            where: { attendeeId: attendeeBefore.id },
            data: { noShow: true },
          });
          attendeesNoShowAudit.push({
            attendeeEmail: host.email,
            noShow: { old: attendeeBefore.noShow ?? null, new: true },
          });
        }
        return Promise.resolve();
      })
    );
    const updatedAttendees = await attendeeRepository.findByBookingId(booking.id);

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

  if (hostsThatDidntJoinTheCall.length === 0) {
    log.debug("All hosts joined the call, skipping no-show workflow");
    return;
  }

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

  try {
    const workflows = (booking.eventType?.workflows?.map((w) => w.workflow) ?? []) as Workflow[];
    const hostNoShowWorkflows = workflows.filter(
      (workflow) => workflow.trigger === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
    );

    if (hostNoShowWorkflows.length === 0) {
      log.debug("No host no-show workflows configured");
      return;
    }

    const hideBranding = await getHideBranding({
      teamId: booking.eventType?.teamId ?? undefined,
    });

    const creditService = new CreditService();

    await scheduleWorkflowReminders({
      workflows: hostNoShowWorkflows,
      calendarEvent: {
        ...bookingWithUpdatedData,
        bookerUrl: "",
        eventType: {
          slug: booking.eventType?.slug ?? "",
          schedulingType: booking.eventType?.schedulingType,
          hosts: booking.eventType?.hosts,
        },
      } as any,
      hideBranding,
      smsReminderNumber: null,
      creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
    });

    log.debug("Host no-show workflows triggered", {
      bookingUid: booking.uid,
      workflowCount: hostNoShowWorkflows.length,
    });
  } catch (error) {
    log.error("Error triggering host no-show workflows", error);
  }
}
