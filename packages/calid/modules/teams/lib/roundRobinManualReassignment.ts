// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { OrganizerDefaultConferencingAppType, getLocationValueForDB } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import {
  sendRoundRobinCancelledEmailsAndSMS as RRCancelledEmailAndSMS,
  sendRoundRobinScheduledEmailsAndSMS as RRScheduledEmailAndSMS,
  sendRoundRobinUpdatedEmailsAndSMS as RRUpdatedEmailAndSMS,
} from "@calcom/emails";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { SENDER_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/lib/delegationCredential/server";
import { getEventName } from "@calcom/lib/event";
// import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { IdempotencyKeyService as KeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat as getTimeFormatString } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata, PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { scheduleEmailReminder, deleteScheduledEmailReminder } from "../../workflows/managers/emailManager";
import { scheduleWorkflowReminders } from "../../workflows/utils/reminderScheduler";
import AssignmentReasonHandler, { RRReassignmentType } from "./RRAssignmentReasonHandler";
import { roundRobinReschedulingManager } from "./roundRobinReschedulingManager";
import type { BookingSelectResult } from "./utils/bookingSelect";
import { bookingSelect } from "./utils/bookingSelect";
import { getMembersInTeam } from "./utils/getMembersInTeam";
import { getTargetCalendar } from "./utils/getTargetCalendar";

enum ErrorCode {
  InvalidRoundRobinHost = "invalid_round_robin_host",
  UserIsFixed = "user_is_round_robin_fixed",
}

type RoundRobinManualUserReassignPayload = {
  bookingId: number;
  newUserId: number;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
  platformClientParams?: PlatformClientParams;
};

type ReassignmentData = {
  booking: BookingSelectResult;
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>;
  targetHost: any;
  previousRRHost: any | null;
  staticHost: any | null;
  requiresOrganizerChange: boolean;
  hostsList: any[];
};

export const roundRobinManualUserReassign = async (
  payload: RoundRobinManualUserReassignPayload
): Promise<BookingSelectResult> => {
  const log = logger.getSubLogger({
    prefix: ["roundRobinManualUserReassign", `${payload.bookingId}`],
  });

  log.info(`User ${payload.reassignedById} initiating manual reassignment to user ${payload.newUserId}`);

  // Load and validate data
  const data = await loadAndValidateData(payload, log);

  // Perform the reassignment
  let updatedBooking: BookingSelectResult;
  let updatedLocation = data.booking.location;

  if (data.requiresOrganizerChange) {
    const result = await performOrganizerSwap(payload, data, log);
    updatedBooking = result.booking;
    updatedLocation = result.location;
  } else {
    updatedBooking = await updateAttendeeRecord(payload, data);
  }

  // Prepare calendar event and sync calendars
  const calendarEvent = await prepareCalendarEvent(payload, data, updatedBooking, updatedLocation);
  const finalCalendarEvent = await synchronizeCalendars(
    payload,
    data,
    updatedBooking,
    updatedLocation,
    calendarEvent
  );

  // Send notifications if enabled
  if (payload.emailsEnabled) {
    await dispatchNotifications(payload, data, updatedBooking, finalCalendarEvent);
  }

  // Update workflows for new organizer
  if (data.requiresOrganizerChange) {
    await handleWorkflows(updatedBooking, data.targetHost.user, finalCalendarEvent, data.eventType);
  }

  return updatedBooking;
};

// ==================== Data Loading & Validation ====================

async function loadAndValidateData(
  payload: RoundRobinManualUserReassignPayload,
  log: ReturnType<typeof logger.getSubLogger>
): Promise<ReassignmentData> {
  const booking = await loadBooking(payload.bookingId, log);
  const eventType = await loadEventType(booking.eventTypeId!, log);
  const hostsList = buildHostsList(eventType);

  const targetHost = hostsList.find((h) => h.user.id === payload.newUserId);
  const staticHost = hostsList.find((h) => h.isFixed);

  validateReassignment(targetHost);

  const requiresOrganizerChange = !staticHost && booking.userId !== payload.newUserId;
  const previousRRHost = detectPreviousRoundRobinHost(booking, hostsList);

  return {
    booking,
    eventType,
    targetHost,
    previousRRHost,
    staticHost,
    requiresOrganizerChange,
    hostsList,
  };
}

async function loadBooking(
  bookingId: number,
  log: ReturnType<typeof logger.getSubLogger>
): Promise<BookingSelectResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: bookingSelect,
  });

  if (!booking?.user) {
    log.error(`Booking ${bookingId} not found or has no associated user`);
    throw new Error("Booking not found or has no associated user");
  }

  if (!booking.eventTypeId) {
    log.error(`Booking ${bookingId} does not have an event type id`);
    throw new Error("Event type not found");
  }

  return booking;
}

async function loadEventType(
  eventTypeId: number,
  log: ReturnType<typeof logger.getSubLogger>
): Promise<Awaited<ReturnType<typeof getEventTypesFromDB>>> {
  const eventType = await getEventTypesFromDB(eventTypeId);

  if (!eventType) {
    log.error(`Event type ${eventTypeId} not found`);
    throw new Error("Event type not found");
  }

  return eventType;
}

function buildHostsList(eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>): any[] {
  return eventType.hosts.length
    ? eventType.hosts
    : eventType.users.map((userRecord) => ({
        user: userRecord,
        isFixed: false,
        priority: 2,
        weight: 100,
        schedule: null,
        createdAt: new Date(0),
      }));
}

function validateReassignment(targetHost: any | undefined): void {
  if (!targetHost) {
    throw new Error(ErrorCode.InvalidRoundRobinHost);
  }

  if (targetHost.isFixed) {
    throw new Error(ErrorCode.UserIsFixed);
  }
}

function detectPreviousRoundRobinHost(booking: BookingSelectResult, hostsList: any[]): any | null {
  const flexibleHosts = hostsList.filter((h) => !h.isFixed);
  const attendeeEmails = new Set(booking.attendees.map((a) => a.email));

  for (const host of flexibleHosts) {
    if (host.user.id === booking.userId || attendeeEmails.has(host.user.email)) {
      return host.user;
    }
  }

  return null;
}

// ==================== Organizer Swap ====================

async function performOrganizerSwap(
  payload: RoundRobinManualUserReassignPayload,
  data: ReassignmentData,
  log: ReturnType<typeof logger.getSubLogger>
): Promise<{ booking: BookingSelectResult; location: string | null }> {
  const responses = await extractValidatedResponses(data);
  const updatedLocation = await determineLocationForNewOrganizer(data, responses);
  const newTitle = await generateBookingTitle(data, responses, updatedLocation);

  const updatedBooking = await prisma.booking.update({
    where: { id: payload.bookingId },
    data: {
      userId: payload.newUserId,
      title: newTitle,
      userPrimaryEmail: data.targetHost.user.email,
      reassignReason: payload.reassignReason,
      reassignById: payload.reassignedById,
      idempotencyKey: KeyService.generate({
        startTime: data.booking.startTime,
        endTime: data.booking.endTime,
        userId: data.targetHost.user.id,
        reassignedById: payload.reassignedById,
      }),
    },
    select: bookingSelect,
  });

  await AssignmentReasonHandler.roundRobinReassignment({
    bookingId: payload.bookingId,
    reassignReason: payload.reassignReason,
    reassignById: payload.reassignedById,
    reassignmentType: RRReassignmentType.MANUAL,
  });

  return { booking: updatedBooking, location: updatedLocation };
}

async function extractValidatedResponses(data: ReassignmentData): Promise<any> {
  const schema = getBookingResponsesSchema({
    bookingFields: data.eventType.bookingFields,
    view: "reschedule",
  });

  const parsed = await schema.safeParseAsync(data.booking.responses);
  return parsed.success ? parsed.data : undefined;
}

async function determineLocationForNewOrganizer(
  data: ReassignmentData,
  responses: any
): Promise<string | null> {
  const usesOrganizerDefault = data.eventType.locations.some(
    (loc) => loc.type === OrganizerDefaultConferencingAppType
  );

  if (!usesOrganizerDefault) {
    return data.booking.location;
  }

  const targetMeta = userMetadata.safeParse(data.targetHost.user.metadata);
  const defaultApp = targetMeta.success ? targetMeta.data?.defaultConferencingApp?.appLink : undefined;
  const currentLoc = data.booking.location || "integrations:daily";

  return defaultApp || getLocationValueForDB(currentLoc, data.eventType.locations).bookingLocation;
}

async function generateBookingTitle(
  data: ReassignmentData,
  responses: any,
  location: string | null
): Promise<string> {
  const targetTranslation = await getTranslation(data.targetHost.user.locale || "en", "common");

  const durationMinutes = dayjs(data.booking.endTime).diff(data.booking.startTime, "minutes");

  return getEventName({
    attendeeName: responses?.name || "Nameless",
    eventType: data.eventType.title,
    eventName: data.eventType.eventName,
    teamName: data.eventType.team?.name,
    host: data.targetHost.user.name || "Nameless",
    location: location || "integrations:daily",
    bookingFields: { ...responses },
    eventDuration: durationMinutes,
    t: targetTranslation,
  });
}

// ==================== Attendee Update ====================

async function updateAttendeeRecord(
  payload: RoundRobinManualUserReassignPayload,
  data: ReassignmentData
): Promise<BookingSelectResult> {
  const rrAttendee = data.booking.attendees.find((att) =>
    data.hostsList.some((h) => !h.isFixed && h.user.email === att.email)
  );

  if (rrAttendee) {
    await prisma.attendee.update({
      where: { id: rrAttendee.id },
      data: {
        name: data.targetHost.user.name || "",
        email: data.targetHost.user.email,
        timeZone: data.targetHost.user.timeZone,
        locale: data.targetHost.user.locale,
      },
    });
  }

  return data.booking;
}

// ==================== Calendar Event Preparation ====================

async function prepareCalendarEvent(
  payload: RoundRobinManualUserReassignPayload,
  data: ReassignmentData,
  updatedBooking: BookingSelectResult,
  updatedLocation: string | null
): Promise<CalendarEvent> {
  const effectiveOrganizer = data.requiresOrganizerChange
    ? data.targetHost.user
    : updatedBooking.user ?? data.targetHost.user;

  const organizerTranslation = await getTranslation(effectiveOrganizer?.locale || "en", "common");

  const teamMembers = await getMembersInTeam({
    eventTypeHosts: data.hostsList,
    attendees: updatedBooking.attendees,
    organizer: effectiveOrganizer,
    previousHost: data.previousRRHost,
    reassignedHost: data.targetHost.user,
  });

  const attendeeList = await buildAttendeeList(updatedBooking, data, teamMembers);

  const targetCalendar = await getTargetCalendar({
    eventType: data.eventType,
    booking: updatedBooking,
    newUserId: payload.newUserId,
    hasOrganizerChanged: data.requiresOrganizerChange,
  });

  return {
    type: data.eventType.slug,
    title: updatedBooking.title,
    description: data.eventType.description,
    startTime: dayjs(updatedBooking.startTime).utc().format(),
    endTime: dayjs(updatedBooking.endTime).utc().format(),
    organizer: {
      email: effectiveOrganizer.email,
      name: effectiveOrganizer.name || "",
      timeZone: effectiveOrganizer.timeZone,
      language: { translate: organizerTranslation, locale: effectiveOrganizer.locale || "en" },
    },
    attendees: attendeeList,
    uid: updatedBooking.uid,
    destinationCalendar: targetCalendar,
    team: {
      members: teamMembers,
      name: data.eventType.team?.name || "",
      id: data.eventType.team?.id || 0,
    },
    hideOrganizerEmail: data.eventType.hideOrganizerEmail,
    customInputs: isPrismaObjOrUndefined(updatedBooking.customInputs),
    ...getCalEventResponses({
      bookingFields: data.eventType.bookingFields ?? null,
      booking: updatedBooking,
    }),
    customReplyToEmail: data.eventType.customReplyToEmail,
    location: updatedLocation,
    ...(payload.platformClientParams ? payload.platformClientParams : {}),
  };
}

async function buildAttendeeList(
  updatedBooking: BookingSelectResult,
  data: ReassignmentData,
  teamMembers: any[]
): Promise<any[]> {
  const promises = updatedBooking.attendees
    .filter((att) => {
      if (att.email === data.targetHost.user.email || att.email === data.previousRRHost?.email) {
        return false;
      }
      return !teamMembers.some((m) => m.email === att.email);
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

  return await Promise.all(promises);
}

// ==================== Calendar Synchronization ====================

async function synchronizeCalendars(
  payload: RoundRobinManualUserReassignPayload,
  data: ReassignmentData,
  updatedBooking: BookingSelectResult,
  updatedLocation: string | null,
  calendarEvent: CalendarEvent
): Promise<CalendarEvent> {
  const targetCredentials = await prisma.credential.findMany({
    where: { userId: data.targetHost.user.id },
    include: { user: { select: { email: true } } },
  });

  const enrichedUser = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...data.targetHost.user, credentials: targetCredentials },
  });

  const previousCalendar = data.requiresOrganizerChange
    ? await prisma.destinationCalendar.findFirst({
        where: { userId: data.booking.user!.id },
      })
    : null;

  const { evtWithAdditionalInfo } = await roundRobinReschedulingManager({
    evt: calendarEvent,
    rescheduleUid: updatedBooking.uid,
    newBookingId: undefined,
    changedOrganizer: data.requiresOrganizerChange,
    previousHostDestinationCalendar: previousCalendar ? [previousCalendar] : [],
    initParams: {
      user: enrichedUser,
      eventType: data.eventType,
    },
    bookingId: payload.bookingId,
    bookingLocation: updatedLocation,
    bookingICalUID: updatedBooking.iCalUID,
    bookingMetadata: updatedBooking.metadata,
  });
  console.log("Event after sync: ", evtWithAdditionalInfo)

  return evtWithAdditionalInfo;
}

// ==================== Notifications ====================

async function dispatchNotifications(
  payload: RoundRobinManualUserReassignPayload,
  data: ReassignmentData,
  updatedBooking: BookingSelectResult,
  calendarEvent: CalendarEvent
): Promise<void> {
  await notifyNewHost(payload, data, calendarEvent);
  await notifyPreviousHost(data, updatedBooking, calendarEvent);

  if (data.requiresOrganizerChange) {
    await notifyAttendeesOfChange(calendarEvent);
  }
}

async function notifyNewHost(
  payload: RoundRobinManualUserReassignPayload,
  data: ReassignmentData,
  calendarEvent: CalendarEvent
): Promise<void> {
  const targetTranslation = await getTranslation(data.targetHost.user.locale || "en", "common");

  const { cancellationReason: _, ...eventData } = calendarEvent;

  await RRScheduledEmailAndSMS({
    calEvent: eventData,
    members: [
      {
        ...data.targetHost.user,
        name: data.targetHost.user.name || "",
        username: data.targetHost.user.username || "",
        timeFormat: getTimeFormatString(data.targetHost.user.timeFormat),
        language: { translate: targetTranslation, locale: data.targetHost.user.locale || "en" },
      },
    ],
    reassigned: {
      name: data.targetHost.user.name,
      email: data.targetHost.user.email,
      reason: payload.reassignReason,
      byUser: data.booking.user!.name || undefined,
    },
  });
}

async function notifyPreviousHost(
  data: ReassignmentData,
  updatedBooking: BookingSelectResult,
  calendarEvent: CalendarEvent
): Promise<void> {
  if (!data.previousRRHost) return;

  const previousTranslation = await getTranslation(data.previousRRHost.locale || "en", "common");
  const formerOwnerTranslation = await getTranslation(data.booking.user!.locale || "en", "common");

  const cancellationEvent = cloneDeep(calendarEvent);
  cancellationEvent.organizer = {
    email: data.booking.user!.email,
    name: data.booking.user!.name || "",
    timeZone: data.booking.user!.timeZone,
    language: { translate: formerOwnerTranslation, locale: data.booking.user!.locale || "en" },
  };

  await RRCancelledEmailAndSMS(
    cancellationEvent,
    [
      {
        ...data.previousRRHost,
        name: data.previousRRHost.name || "",
        username: data.previousRRHost.username || "",
        timeFormat: getTimeFormatString(data.previousRRHost.timeFormat),
        language: { translate: previousTranslation, locale: data.previousRRHost.locale || "en" },
      },
    ],
    data.eventType.metadata as EventTypeMetadata,
    { name: data.targetHost.user.name, email: data.targetHost.user.email }
  );
}

async function notifyAttendeesOfChange(calendarEvent: CalendarEvent): Promise<void> {
  const eventInFuture = dayjs(calendarEvent.startTime).isAfter(dayjs());

  if (!eventInFuture) return;

  const { cancellationReason: _, ...eventData } = calendarEvent;

  await RRUpdatedEmailAndSMS({
    calEvent: eventData,
  });
}

// ==================== Workflow Management ====================

const calIdWorkflowReminderSelect = {
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
};

export async function handleWorkflows(
  booking: BookingSelectResult,
  newUser: {
    id: number;
    email: string;
    locale?: string | null;
  },
  evt: CalendarEvent,
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>
): Promise<void> {
  await rescheduleExistingReminders(booking, newUser, evt, eventType);
  await createNewEventTriggers(booking, evt, eventType);
}

async function rescheduleExistingReminders(
  booking: BookingSelectResult,
  newUser: { id: number; email: string; locale?: string | null },
  evt: CalendarEvent,
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>
): Promise<void> {
  const activeReminders = await fetchActiveReminders(booking);
  const bookerUrl = WEBSITE_URL;

  const eventMeta = { videoCallUrl: getVideoCallUrlFromCalEvent(evt) };

  for (const reminder of activeReminders) {
    if (!reminder.workflowStep) continue;

    const workflow = reminder.workflowStep.workflow;

    await scheduleEmailReminder({
      evt: {
        ...evt,
        metadata: eventMeta,
        eventType: eventType,
        bookerUrl,
      },
      action: WorkflowActions.EMAIL_HOST,
      triggerEvent: workflow.trigger,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      sendTo: [newUser.email],
      template: reminder.workflowStep.template ?? null,
      emailSubject: reminder.workflowStep.emailSubject || undefined,
      emailBody: reminder.workflowStep.reminderBody || undefined,
      sender: reminder.workflowStep.sender || SENDER_NAME,
      hideBranding: true,
      includeCalendarEvent: reminder.workflowStep.includeCalendarEvent,
      workflowStepId: reminder.workflowStep.id,
      verifiedAt: reminder.workflowStep.verifiedAt,
      userId: workflow.userId,
      teamId: workflow.calIdTeamId,
    });

    await deleteScheduledEmailReminder(reminder.id);
  }
}

async function fetchActiveReminders(booking: BookingSelectResult): Promise<any[]> {
  const validTriggers: WorkflowTriggerEvents[] = [
    WorkflowTriggerEvents.BEFORE_EVENT,
    WorkflowTriggerEvents.NEW_EVENT,
    WorkflowTriggerEvents.AFTER_EVENT,
  ];

  const bookingUid = booking.uid

  return await prisma.calIdWorkflowReminder.findMany({
    where: {
      bookingUid: bookingUid,
      method: WorkflowMethods.EMAIL,
      scheduled: true,
      OR: [{ cancelled: false }, { cancelled: null }],
      workflowStep: {
        action: WorkflowActions.EMAIL_HOST,
        workflow: {
          trigger: {
            in: validTriggers,
          },
        },
      },
    },
    select: calIdWorkflowReminderSelect,
  });
}

async function createNewEventTriggers(
  booking: BookingSelectResult,
  evt: CalendarEvent,
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>
): Promise<void> {
  const workflows = await fetchNewEventWorkflows(eventType);
  const bookerUrl = WEBSITE_URL;
  const eventMeta = { videoCallUrl: getVideoCallUrlFromCalEvent(evt) };

  await scheduleWorkflowReminders({
    workflows,
    smsReminderNumber: null,
    calendarEvent: {
      ...evt,
      metadata: eventMeta,
      eventType: { slug: eventType.slug },
      bookerUrl,
    },
    hideBranding: !!eventType?.owner?.hideBranding,
  });
}

async function fetchNewEventWorkflows(
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>
): Promise<any[]> {
  return await prisma.calIdWorkflow.findMany({
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
}

export default roundRobinManualUserReassign;
