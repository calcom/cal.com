// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { OrganizerDefaultConferencingAppType, getLocationValueForDB } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import {
  sendRoundRobinCancelledEmailsAndSMS,
  sendRoundRobinScheduledEmailsAndSMS,
  sendRoundRobinUpdatedEmailsAndSMS,
} from "@calcom/emails";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { SENDER_NAME } from "@calcom/lib/constants";
import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/lib/delegationCredential/server";
import { getEventName } from "@calcom/lib/event";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata, PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { scheduleEmailReminder, deleteScheduledEmailReminder } from "../../workflows/managers/emailManager";
import { scheduleWorkflowReminders } from "../../workflows/utils/reminderScheduler";
import AssignmentReasonHandler, { RRReassignmentType } from "./RRAssignmentReasonHandler";
import { roundRobinReschedulingManager } from "./handleRescheduleEventManager";
import type { BookingSelectResult } from "./utils/bookingSelect";
import { bookingSelect } from "./utils/bookingSelect";
import { getDestinationCalendar } from "./utils/getDestinationCalendar";
import { getTeamMembers } from "./utils/getTeamMembers";

enum ErrorCode {
  InvalidRoundRobinHost = "invalid_round_robin_host",
  UserIsFixed = "user_is_round_robin_fixed",
}

export const roundRobinManualReassignment = async ({
  bookingId,
  newUserId,
  orgId,
  reassignReason,
  reassignedById,
  emailsEnabled = true,
  platformClientParams,
}: {
  bookingId: number;
  newUserId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
  platformClientParams?: PlatformClientParams;
}) => {
  const reassignmentLogger = logger.getSubLogger({
    prefix: ["roundRobinManualReassign", `${bookingId}`],
  });

  reassignmentLogger.info(`User ${reassignedById} initiating manual reassignment to user ${newUserId}`);

  const fetchedBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: bookingSelect,
  });

  if (!fetchedBooking?.user) {
    reassignmentLogger.error(`Booking ${bookingId} not found or has no associated user`);
    throw new Error("Booking not found or has no associated user");
  }

  if (!fetchedBooking.eventTypeId) {
    reassignmentLogger.error(`Booking ${bookingId} does not have an event type id`);
    throw new Error("Event type not found");
  }

  const eventTypeRecord = await getEventTypesFromDB(fetchedBooking.eventTypeId);

  if (!eventTypeRecord) {
    reassignmentLogger.error(`Event type ${fetchedBooking.eventTypeId} not found`);
    throw new Error("Event type not found");
  }

  const hostsForEventType = eventTypeRecord.hosts.length
    ? eventTypeRecord.hosts
    : eventTypeRecord.users.map((userRecord) => ({
        user: userRecord,
        isFixed: false,
        priority: 2,
        weight: 100,
        schedule: null,
        createdAt: new Date(0),
      }));

  const targetHost = hostsForEventType.find((hostEntry) => hostEntry.user.id === newUserId);

  if (!targetHost) {
    throw new Error(ErrorCode.InvalidRoundRobinHost);
  }

  if (targetHost.isFixed) {
    throw new Error(ErrorCode.UserIsFixed);
  }

  const staticHost = hostsForEventType.find((hostEntry) => hostEntry.isFixed);
  const formerBookingOwner = fetchedBooking.user;
  const requiresOrganizerSwap = !staticHost && fetchedBooking.userId !== newUserId;

  const targetUserRecord = targetHost.user;
  const targetUserTranslation = await getTranslation(targetUserRecord.locale || "en", "common");
  const formerOwnerTranslation = await getTranslation(formerBookingOwner.locale || "en", "common");

  const variableHosts = eventTypeRecord.hosts.filter((hostEntry) => !hostEntry.isFixed);

  const attendeeEmailMap = new Set(fetchedBooking.attendees.map((att) => att.email));

  const identifyPreviousRRHost = () => {
    for (const hostEntry of variableHosts) {
      if (hostEntry.user.id === fetchedBooking.userId) {
        return hostEntry.user;
      }
      if (attendeeEmailMap.has(hostEntry.user.email)) {
        return hostEntry.user;
      }
    }
  };

  const priorRoundRobinHost = identifyPreviousRRHost();

  const priorHostTranslation = await getTranslation(priorRoundRobinHost?.locale || "en", "common");
  let updatedLocation = fetchedBooking.location;
  let currentBooking = fetchedBooking;

  if (requiresOrganizerSwap) {
    const existingResponses = fetchedBooking.responses;
    const responseValidationSchema = getBookingResponsesSchema({
      bookingFields: eventTypeRecord.bookingFields,
      view: "reschedule",
    });
    const parsedResponses = await responseValidationSchema.safeParseAsync(existingResponses);
    const validatedResponses = parsedResponses.success ? parsedResponses.data : undefined;

    const usesOrganizerDefault = eventTypeRecord.locations.some(
      (loc) => loc.type === OrganizerDefaultConferencingAppType
    );

    if (usesOrganizerDefault) {
      const targetUserMeta = userMetadataSchema.safeParse(targetUserRecord.metadata);
      const fallbackLocation = targetUserMeta.success
        ? targetUserMeta?.data?.defaultConferencingApp?.appLink
        : undefined;
      const existingLocation = fetchedBooking.location || "integrations:daily";
      updatedLocation =
        fallbackLocation ||
        getLocationValueForDB(existingLocation, eventTypeRecord.locations).bookingLocation;
    }

    const eventDurationMinutes = dayjs(fetchedBooking.endTime).diff(fetchedBooking.startTime, "minutes");

    const refreshedTitle = getEventName({
      attendeeName: validatedResponses?.name || "Nameless",
      eventType: eventTypeRecord.title,
      eventName: eventTypeRecord.eventName,
      teamName: eventTypeRecord.team?.name,
      host: targetUserRecord.name || "Nameless",
      location: updatedLocation || "integrations:daily",
      bookingFields: { ...validatedResponses },
      eventDuration: eventDurationMinutes,
      t: targetUserTranslation,
    });

    currentBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        userId: newUserId,
        title: refreshedTitle,
        userPrimaryEmail: targetUserRecord.email,
        reassignReason,
        reassignById: reassignedById,
        idempotencyKey: IdempotencyKeyService.generate({
          startTime: fetchedBooking.startTime,
          endTime: fetchedBooking.endTime,
          userId: targetUserRecord.id,
          reassignedById,
        }),
      },
      select: bookingSelect,
    });

    await AssignmentReasonHandler.roundRobinReassignment({
      bookingId,
      reassignReason,
      reassignById: reassignedById,
      reassignmentType: RRReassignmentType.MANUAL,
    });
  } else {
    const currentRRAttendee = fetchedBooking.attendees.find((att) =>
      hostsForEventType.some((hostEntry) => !hostEntry.isFixed && hostEntry.user.email === att.email)
    );

    if (currentRRAttendee) {
      await prisma.attendee.update({
        where: { id: currentRRAttendee.id },
        data: {
          name: targetUserRecord.name || "",
          email: targetUserRecord.email,
          timeZone: targetUserRecord.timeZone,
          locale: targetUserRecord.locale,
        },
      });
    }
  }

  const targetCalendar = await getDestinationCalendar({
    eventType: eventTypeRecord,
    booking: currentBooking,
    newUserId,
    hasOrganizerChanged: requiresOrganizerSwap,
  });

  const effectiveOrganizer = requiresOrganizerSwap
    ? targetUserRecord
    : currentBooking.user ?? targetUserRecord;

  const effectiveOrganizerTranslation = await getTranslation(effectiveOrganizer?.locale || "en", "common");

  const assembledTeamMembers = await getTeamMembers({
    eventTypeHosts: hostsForEventType,
    attendees: currentBooking.attendees,
    organizer: effectiveOrganizer,
    previousHost: priorRoundRobinHost || null,
    reassignedHost: targetUserRecord,
  });

  const attendeeTranslationPromises = currentBooking.attendees
    .filter((att) => {
      if (att.email === targetUserRecord.email || att.email === priorRoundRobinHost?.email) {
        return false;
      }
      return !assembledTeamMembers.some((member) => member.email === att.email);
    })
    .map(async (att) => {
      const translation = await getTranslation(att.locale ?? "en", "common");
      return {
        email: att.email,
        name: att.name,
        timeZone: att.timeZone,
        language: { translate: translation, locale: att.locale ?? "en" },
        phoneNumber: att.phoneNumber || undefined,
      };
    });

  const processedAttendees = await Promise.all(attendeeTranslationPromises);

  const calendarEventData: CalendarEvent = {
    type: eventTypeRecord.slug,
    title: currentBooking.title,
    description: eventTypeRecord.description,
    startTime: dayjs(currentBooking.startTime).utc().format(),
    endTime: dayjs(currentBooking.endTime).utc().format(),
    organizer: {
      email: effectiveOrganizer.email,
      name: effectiveOrganizer.name || "",
      timeZone: effectiveOrganizer.timeZone,
      language: { translate: effectiveOrganizerTranslation, locale: effectiveOrganizer.locale || "en" },
    },
    attendees: processedAttendees,
    uid: currentBooking.uid,
    destinationCalendar: targetCalendar,
    team: {
      members: assembledTeamMembers,
      name: eventTypeRecord.team?.name || "",
      id: eventTypeRecord.team?.id || 0,
    },
    hideOrganizerEmail: eventTypeRecord.hideOrganizerEmail,
    customInputs: isPrismaObjOrUndefined(currentBooking.customInputs),
    ...getCalEventResponses({
      bookingFields: eventTypeRecord.bookingFields ?? null,
      booking: currentBooking,
    }),
    customReplyToEmail: eventTypeRecord?.customReplyToEmail,
    location: updatedLocation,
    ...(platformClientParams ? platformClientParams : {}),
  };

  const targetUserCredentials = await prisma.credential.findMany({
    where: { userId: targetUserRecord.id },
    include: { user: { select: { email: true } } },
  });

  const enrichedTargetUser = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...targetUserRecord, credentials: targetUserCredentials },
  });

  const formerHostCalendar = requiresOrganizerSwap
    ? await prisma.destinationCalendar.findFirst({
        where: { userId: formerBookingOwner.id },
      })
    : null;

  const { evtWithAdditionalInfo: enhancedEventData } = await roundRobinReschedulingManager({
    evt: calendarEventData,
    rescheduleUid: currentBooking.uid,
    newBookingId: undefined,
    changedOrganizer: requiresOrganizerSwap,
    previousHostDestinationCalendar: formerHostCalendar ? [formerHostCalendar] : [],
    initParams: {
      user: enrichedTargetUser,
      eventType: eventTypeRecord,
    },
    bookingId,
    bookingLocation: updatedLocation,
    bookingICalUID: currentBooking.iCalUID,
    bookingMetadata: currentBooking.metadata,
  });

  const { cancellationReason: _removed, ...eventWithoutCancellation } = enhancedEventData;

  if (emailsEnabled) {
    await sendRoundRobinScheduledEmailsAndSMS({
      calEvent: eventWithoutCancellation,
      members: [
        {
          ...targetUserRecord,
          name: targetUserRecord.name || "",
          username: targetUserRecord.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(targetUserRecord.timeFormat),
          language: { translate: targetUserTranslation, locale: targetUserRecord.locale || "en" },
        },
      ],
      reassigned: {
        name: targetUserRecord.name,
        email: targetUserRecord.email,
        reason: reassignReason,
        byUser: formerBookingOwner.name || undefined,
      },
    });
  }

  const cancellationEventData = cloneDeep(enhancedEventData);
  cancellationEventData.organizer = {
    email: formerBookingOwner.email,
    name: formerBookingOwner.name || "",
    timeZone: formerBookingOwner.timeZone,
    language: { translate: formerOwnerTranslation, locale: formerBookingOwner.locale || "en" },
  };

  if (priorRoundRobinHost && emailsEnabled) {
    await sendRoundRobinCancelledEmailsAndSMS(
      cancellationEventData,
      [
        {
          ...priorRoundRobinHost,
          name: priorRoundRobinHost.name || "",
          username: priorRoundRobinHost.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(priorRoundRobinHost.timeFormat),
          language: { translate: priorHostTranslation, locale: priorRoundRobinHost.locale || "en" },
        },
      ],
      eventTypeRecord?.metadata as EventTypeMetadata,
      { name: targetUserRecord.name, email: targetUserRecord.email }
    );
  }

  if (requiresOrganizerSwap) {
    const eventStartsInFuture = dayjs(calendarEventData.startTime).isAfter(dayjs());

    if (emailsEnabled && eventStartsInFuture) {
      await sendRoundRobinUpdatedEmailsAndSMS({
        calEvent: eventWithoutCancellation,
      });
    }

    await handleWorkflowsUpdate({
      booking: currentBooking,
      newUser: targetUserRecord,
      evt: enhancedEventData,
      eventType: eventTypeRecord,
      orgId,
    });
  }

  return currentBooking;
};

export async function handleWorkflowsUpdate({
  booking,
  newUser,
  evt,
  eventType,
  orgId,
}: {
  booking: BookingSelectResult;
  newUser: {
    id: number;
    email: string;
    locale?: string | null;
  };
  evt: CalendarEvent;
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>;
  orgId: number | null;
}) {
  const scheduledReminders = await prisma.calIdWorkflowReminder.findMany({
    where: {
      bookingUid: booking.uid,
      method: WorkflowMethods.EMAIL,
      scheduled: true,
      OR: [{ cancelled: false }, { cancelled: null }],
      workflowStep: {
        action: WorkflowActions.EMAIL_HOST,
        workflow: {
          trigger: {
            in: [
              WorkflowTriggerEvents.BEFORE_EVENT,
              WorkflowTriggerEvents.NEW_EVENT,
              WorkflowTriggerEvents.AFTER_EVENT,
            ],
          },
        },
      },
    },
    select: {
      id: true,
      referenceId: true,
      workflowStep: {
        select: {
          id: true,
          template: true,
          workflow: {
            select: {
              userId: true,
              calIdTeamId: true,
              trigger: true,
              time: true,
              timeUnit: true,
            },
          },
          emailSubject: true,
          reminderBody: true,
          sender: true,
          includeCalendarEvent: true,
          verifiedAt: true,
        },
      },
    },
  });

  const eventMetadataWithVideo = { videoCallUrl: getVideoCallUrlFromCalEvent(evt) };
  const bookerBaseUrl = await getBookerBaseUrl(orgId);

  for (const reminderRecord of scheduledReminders) {
    const stepDetails = reminderRecord.workflowStep;

    if (stepDetails) {
      const workflowConfig = stepDetails.workflow;
      await scheduleEmailReminder({
        evt: {
          ...evt,
          metadata: eventMetadataWithVideo,
          eventType,
          bookerUrl: bookerBaseUrl,
        },
        action: WorkflowActions.EMAIL_HOST,
        triggerEvent: workflowConfig.trigger,
        timeSpan: {
          time: workflowConfig.time,
          timeUnit: workflowConfig.timeUnit,
        },
        sendTo: [newUser.email],
        template: stepDetails.template,
        emailSubject: stepDetails.emailSubject || undefined,
        emailBody: stepDetails.reminderBody || undefined,
        sender: stepDetails.sender || SENDER_NAME,
        hideBranding: true,
        includeCalendarEvent: stepDetails.includeCalendarEvent,
        workflowStepId: stepDetails.id,
        verifiedAt: stepDetails.verifiedAt,
        userId: workflowConfig.userId,
        teamId: workflowConfig.teamId,
      });
    }

    await deleteScheduledEmailReminder(reminderRecord.id);
  }

  const newEventTriggerWorkflows = await prisma.calIdWorkflow.findMany({
    where: {
      trigger: WorkflowTriggerEvents.NEW_EVENT,
      OR: [
        {
          isActiveOnAll: true,
          calIdTeamId: eventType?.calIdTeam?.id,
        },
        {
          activeOn: {
            some: {
              eventTypeId: eventType.id,
            },
          },
        },
        ...(eventType?.calIdTeamId
          ? [
              {
                activeOnTeams: {
                  some: {
                    calIdTeamId: eventType.calIdTeam?.id,
                  },
                },
              },
            ]
          : []),
      ],
    },
    include: {
      steps: {
        where: {
          action: WorkflowActions.EMAIL_HOST,
        },
      },
    },
  });

  await scheduleWorkflowReminders({
    workflows: newEventTriggerWorkflows,
    smsReminderNumber: null,
    calendarEvent: {
      ...evt,
      metadata: eventMetadataWithVideo,
      eventType: { slug: eventType.slug },
      bookerUrl: bookerBaseUrl,
    },
    hideBranding: !!eventType?.owner?.hideBranding,
  });
}

export default roundRobinManualReassignment;
