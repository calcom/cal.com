import { getAllWorkflows } from "@calcom/ee/workflows/lib/getAllWorkflows";
import { scheduleAIPhoneCall } from "@calcom/ee/workflows/lib/reminders/aiPhoneCallManager";
import { scheduleEmailReminder } from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import { scheduleSMSReminder } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import { scheduleWhatsappReminder } from "@calcom/ee/workflows/lib/reminders/whatsappReminderManager";
import type { Workflow as WorkflowType } from "@calcom/ee/workflows/lib/types";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { Workflow, WorkflowStep } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import {
  MembershipRole,
  SchedulingType,
  WorkflowActions,
  WorkflowTriggerEvents,
  WorkflowType as PrismaWorkflowType,
} from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { CalEventResponses } from "@calcom/types/Calendar";

/**
 * Check if a user is authorized to access a workflow.
 * For personal workflows (no teamId), checks if user owns the workflow.
 * For team workflows, uses PBAC (Permission-Based Access Control).
 */
export async function isAuthorized(
  workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null,
  currentUserId: number,
  permission: PermissionString = "workflow.read"
) {
  if (!workflow) {
    return false;
  }

  // For personal workflows (no teamId), check if user owns the workflow
  if (!workflow.teamId) {
    return workflow.userId === currentUserId;
  }

  // For team workflows, use PBAC
  const permissionService = new PermissionCheckService();

  // Determine fallback roles based on permission type
  const fallbackRoles =
    permission === "workflow.read"
      ? [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER]
      : [MembershipRole.ADMIN, MembershipRole.OWNER];

  return await permissionService.checkPermission({
    userId: currentUserId,
    teamId: workflow.teamId,
    permission,
    fallbackRoles,
  });
}

/**
 * Get all workflows that apply to an event type.
 * This includes workflows directly attached to the event type,
 * as well as team/org-level workflows that apply.
 */
export async function getAllWorkflowsFromEventType(
  eventType: {
    workflows?: {
      workflow: WorkflowType;
    }[];
    teamId?: number | null;
    parentId?: number | null;
    parent?: {
      id?: number | null;
      teamId: number | null;
    } | null;
    metadata?: Prisma.JsonValue;
  } | null,
  userId?: number | null
) {
  if (!eventType) return [];

  const eventTypeWorkflows = eventType?.workflows?.map((workflowRel) => workflowRel.workflow) ?? [];

  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: eventType?.teamId ?? null },
      parentId: eventType?.parentId || eventType?.parent?.id || null,
    },
  });

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

  const isManagedEventType = !!eventType?.parent;

  const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});

  const workflowsLockedForUser = isManagedEventType
    ? !eventTypeMetadata?.managedEventConfig?.unlockedFields?.workflows
    : false;

  const allWorkflows = await getAllWorkflows({
    entityWorkflows: eventTypeWorkflows,
    userId,
    teamId,
    orgId,
    workflowsLockedForUser,
    type: PrismaWorkflowType.EVENT_TYPE,
  });

  return allWorkflows;
}

type BookingsForReminders = Awaited<ReturnType<typeof WorkflowRepository.getBookingsForWorkflowReminders>>;

/**
 * Schedule workflow notifications for bookings.
 * This is used when a workflow is created/updated to schedule reminders for existing bookings.
 */
export async function scheduleWorkflowNotifications({
  activeOn,
  isOrg,
  workflowSteps,
  time,
  timeUnit,
  trigger,
  userId,
  teamId,
  alreadyScheduledActiveOnIds,
}: {
  activeOn: number[];
  isOrg: boolean;
  workflowSteps: Partial<WorkflowStep>[];
  time: number | null;
  timeUnit: TimeUnit | null;
  trigger: WorkflowTriggerEvents;
  userId: number;
  teamId: number | null;
  alreadyScheduledActiveOnIds?: number[];
}) {
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT) return;

  const bookingsToScheduleNotifications = await WorkflowRepository.getBookingsForWorkflowReminders({
    activeOn,
    isOrg,
    alreadyScheduledActiveOnIds,
  });

  await scheduleBookingReminders(
    bookingsToScheduleNotifications,
    workflowSteps,
    time,
    timeUnit,
    trigger,
    userId,
    teamId,
    isOrg
  );
}

/**
 * Schedule reminders for a list of bookings based on workflow steps.
 */
export async function scheduleBookingReminders(
  bookings: BookingsForReminders,
  workflowSteps: Partial<WorkflowStep>[],
  time: number | null,
  timeUnit: TimeUnit | null,
  trigger: WorkflowTriggerEvents,
  userId: number,
  teamId: number | null,
  isOrg: boolean
) {
  if (!bookings.length) return;
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT) return;

  const bookerUrl = await getBookerBaseUrl(isOrg ? teamId : null);

  const creditService = new CreditService();

  // Create reminders for all bookings for each workflow step
  const promiseSteps = workflowSteps.map(async (step) => {
    const promiseScheduleReminders = bookings.map(async (booking) => {
      const defaultLocale = "en";
      const bookingInfo = {
        uid: booking.uid,
        bookerUrl,
        type: booking.eventType?.slug || "event",
        attendees: booking.attendees.map((attendee) => {
          return {
            name: attendee.name,
            email: attendee.email,
            timeZone: attendee.timeZone,
            language: { locale: attendee.locale || defaultLocale },
          };
        }),
        organizer: booking.user
          ? {
              language: { locale: booking.user.locale || defaultLocale },
              name: booking.user.name || "",
              email: booking?.userPrimaryEmail ?? booking.user.email,
              timeZone: booking.user.timeZone,
              timeFormat: getTimeFormatStringFromUserTimeFormat(booking.user.timeFormat),
            }
          : { name: "", email: "", timeZone: "", language: { locale: "" } },
        startTime: booking.startTime?.toISOString(),
        endTime: booking.endTime?.toISOString(),
        title: booking.title,
        language: { locale: booking?.user?.locale || defaultLocale },
        hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
        eventType: {
          slug: booking.eventType?.slug || "",
          schedulingType: booking.eventType?.schedulingType,
          hosts: booking.eventType?.hosts,
        },
        metadata: booking.metadata,
        customReplyToEmail: booking.eventType?.customReplyToEmail,
        responses: booking.responses as CalEventResponses | null,
      };
      if (
        step.action === WorkflowActions.EMAIL_HOST ||
        step.action === WorkflowActions.EMAIL_ATTENDEE ||
        step.action === WorkflowActions.EMAIL_ADDRESS
      ) {
        let sendTo: string[] = [];

        switch (step.action) {
          case WorkflowActions.EMAIL_HOST: {
            sendTo = [bookingInfo.organizer?.email];
            const schedulingType = bookingInfo.eventType.schedulingType;
            const hosts = bookingInfo.eventType.hosts
              ?.filter((host) => bookingInfo.attendees.some((attendee) => attendee.email === host.user.email))
              .map(({ user }) => user.destinationCalendar?.primaryEmail ?? user.email);
            if (
              hosts &&
              (schedulingType === SchedulingType.ROUND_ROBIN || schedulingType === SchedulingType.COLLECTIVE)
            ) {
              sendTo = sendTo.concat(hosts);
            }
            break;
          }
          case WorkflowActions.EMAIL_ATTENDEE:
            sendTo = bookingInfo.attendees.map((attendee) => attendee.email);
            break;
          case WorkflowActions.EMAIL_ADDRESS:
            sendTo = [step.sendTo || ""];
            break;
        }

        await scheduleEmailReminder({
          evt: bookingInfo,
          triggerEvent: trigger,
          action: step.action,
          timeSpan: {
            time,
            timeUnit,
          },
          sendTo,
          emailSubject: step.emailSubject || "",
          emailBody: step.reminderBody || "",
          template: step.template,
          sender: step.sender,
          workflowStepId: step.id,
          verifiedAt: step?.verifiedAt ?? null,
        });
      } else if (step.action === WorkflowActions.SMS_NUMBER && step.sendTo) {
        await scheduleSMSReminder({
          evt: bookingInfo,
          reminderPhone: step.sendTo,
          triggerEvent: trigger,
          action: step.action,
          timeSpan: {
            time,
            timeUnit,
          },
          message: step.reminderBody || "",
          workflowStepId: step.id,
          template: step.template,
          sender: step.sender,
          userId: userId,
          teamId: teamId,
          verifiedAt: step?.verifiedAt ?? null,
          creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
        });
      } else if (step.action === WorkflowActions.WHATSAPP_NUMBER && step.sendTo) {
        await scheduleWhatsappReminder({
          evt: bookingInfo,
          reminderPhone: step.sendTo,
          triggerEvent: trigger,
          action: step.action,
          timeSpan: {
            time,
            timeUnit,
          },
          message: step.reminderBody || "",
          workflowStepId: step.id || 0,
          template: step.template,
          userId: userId,
          teamId: teamId,
          verifiedAt: step?.verifiedAt ?? null,
          creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
        });
      } else if (booking.smsReminderNumber) {
        if (step.action === WorkflowActions.SMS_ATTENDEE) {
          await scheduleSMSReminder({
            evt: bookingInfo,
            reminderPhone: booking.smsReminderNumber,
            triggerEvent: trigger,
            action: step.action,
            timeSpan: {
              time,
              timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id,
            template: step.template,
            sender: step.sender,
            userId: userId,
            teamId: teamId,
            verifiedAt: step?.verifiedAt ?? null,
            creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
          });
        } else if (step.action === WorkflowActions.WHATSAPP_ATTENDEE) {
          await scheduleWhatsappReminder({
            evt: bookingInfo,
            reminderPhone: booking.smsReminderNumber,
            triggerEvent: trigger,
            action: step.action,
            timeSpan: {
              time,
              timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id,
            template: step.template,
            sender: step.sender,
            userId: userId,
            teamId: teamId,
            verifiedAt: step?.verifiedAt ?? null,
            creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
          });
        }
      } else if (step.action === WorkflowActions.CAL_AI_PHONE_CALL) {
        await scheduleAIPhoneCall({
          evt: bookingInfo,
          triggerEvent: trigger,
          timeSpan: {
            time,
            timeUnit,
          },
          workflowStepId: step.id,
          userId,
          teamId,
          verifiedAt: step?.verifiedAt ?? null,
          submittedPhoneNumber: booking.smsReminderNumber,
          routedEventTypeId: null,
        });
      }
    });
    await Promise.all(promiseScheduleReminders);
  });
  return Promise.all(promiseSteps);
}
