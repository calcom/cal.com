import { BookingCreated, type EventType } from "@calcom/features/bookings/lib/bookingDomainEvents";
import type { DomainEventListener } from "@calcom/lib/domainEvent/domainEvent";
import { onDomainEvent } from "@calcom/lib/domainEvent/onDomainEvent";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";

import { type ExtendedCalendarEvent, scheduleWorkflowReminders } from "../reminders/reminderScheduler";
import { scheduleMandatoryReminder } from "../reminders/scheduleMandatoryReminder";
import { workflowRepository } from "../repository/workflowRepository";
import { type Workflow } from "../types";

export class WorkflowBookingListener implements DomainEventListener {
  @onDomainEvent(BookingCreated)
  async onBookingCreated({ booking }: BookingCreated): Promise<void> {
    if (booking.isDryRun) return;

    const workflows = await this.getWorkflows(booking.eventType, booking.user.id);

    const calendarEvent: ExtendedCalendarEvent = {
      ...booking.calendarEvent,
      rescheduleReason: booking.rescheduleReason,
      metadata: booking.videoCallUrl ? { videoCallUrl: booking.videoCallUrl } : undefined,
      eventType: booking.eventType,
      bookerUrl: booking.bookerUrl,
    };
    await Promise.all([
      !booking.eventType.metadata?.disableStandardEmails?.all?.attendee &&
        scheduleMandatoryReminder({
          workflows,
          evt: calendarEvent,
          requiresConfirmation: booking.requiresConfirmation,
          hideBranding: !!booking.eventType.owner?.hideBranding,
          seatReferenceUid: booking.calendarEvent.attendeeSeatId,
          isPlatformNoEmail: booking.noEmail && Boolean(booking.platformClientId),
          isDryRun: booking.isDryRun,
        }),

      scheduleWorkflowReminders({
        workflows,
        calendarEvent,
        smsReminderNumber: booking.smsReminderNumber || null,
        isNotConfirmed: booking.isNotConfirmed,
        isRescheduleEvent: !!booking.rescheduleUid,
        isFirstRecurringEvent: !booking.isRecurring || booking.isFirstRecurringEvent,
        hideBranding: !!booking.eventType.owner?.hideBranding,
        seatReferenceUid: calendarEvent.attendeeSeatId,
        isDryRun: booking.isDryRun,
      }),
    ]);
  }

  private async getWorkflows(eventType: EventType, userId: number): Promise<Workflow[]> {
    const loaders = [] as Array<Promise<void>>;
    const workflowSet = new WorkflowSet();
    const load = (promise: Promise<Workflow[]>) => loaders.push(promise.then((x) => workflowSet.add(x)));

    load(workflowRepository.getWorkflowsActiveOnEventType(eventType.id));

    const teamId = await getTeamIdFromEventType({
      eventType: { team: { id: eventType.teamId }, parentId: eventType.parentId },
    });
    if (teamId) {
      load(workflowRepository.getTeamWorkflows(teamId, { isActiveOnAll: true }));
    }

    if (userId && !this.workflowsLockedForUser(eventType, teamId)) {
      load(workflowRepository.getUserWorkflows(userId, { isActiveOnAll: true, teamId: null }));
    }

    const orgId = await getOrgIdFromMemberOrTeamId({ teamId, memberId: userId });
    if (orgId) {
      if (teamId) {
        load(workflowRepository.getWorkflowsActiveOnTeam(teamId));
      } else if (userId) {
        load(workflowRepository.getWorkflowsActiveOnTeamMember(userId));
      }
      load(workflowRepository.getTeamWorkflows(orgId, { isActiveOnAll: true }));
    }

    await Promise.all(loaders);
    return workflowSet.getValues();
  }

  private workflowsLockedForUser(eventType: EventType, teamId?: number | null): boolean {
    if (!teamId || !eventType.parentId) return false; // Not managed event type
    return !eventType.metadata?.managedEventConfig?.unlockedFields?.workflows;
  }
}

class WorkflowSet {
  private values: Workflow[] = [];
  private idSet = new Set<number>();

  add(workflows: Workflow[]): void {
    workflows.forEach((workflow) => {
      if (!this.idSet.has(workflow.id)) {
        this.idSet.add(workflow.id);
        this.values.push(workflow);
      }
    });
  }

  getValues(): Workflow[] {
    return this.values;
  }
}
