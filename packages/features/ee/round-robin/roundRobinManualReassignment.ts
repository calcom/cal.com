// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import {
  sendRoundRobinReassignedEmailsAndSMS,
  sendRoundRobinScheduledEmailsAndSMS,
  sendRoundRobinUpdatedEmailsAndSMS,
} from "@calcom/emails";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import AssignmentReasonRecorder, {
  RRReassignmentType,
} from "@calcom/features/ee/round-robin/assignmentReason/AssignmentReasonRecorder";
import { BookingLocationService } from "@calcom/features/ee/round-robin/lib/bookingLocationService";
import {
  scheduleEmailReminder,
  deleteScheduledEmailReminder,
} from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { SENDER_NAME } from "@calcom/lib/constants";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { EventTypeMetadata, PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { handleRescheduleEventManager } from "./handleRescheduleEventManager";
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
  const roundRobinReassignLogger = logger.getSubLogger({
    prefix: ["roundRobinManualReassign", `${bookingId}`],
  });

  roundRobinReassignLogger.info(`User ${reassignedById} initiating manual reassignment to user ${newUserId}`);

  let booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: bookingSelect,
  });

  if (!booking || !booking.user) {
    roundRobinReassignLogger.error(`Booking ${bookingId} not found or has no associated user`);
    throw new Error("Booking not found or has no associated user");
  }

  const eventTypeId = booking.eventTypeId;
  if (!eventTypeId) {
    roundRobinReassignLogger.error(`Booking ${bookingId} does not have an event type id`);
    throw new Error("Event type not found");
  }

  const eventType = await getEventTypesFromDB(eventTypeId);
  if (!eventType) {
    roundRobinReassignLogger.error(`Event type ${eventTypeId} not found`);
    throw new Error("Event type not found");
  }

  if (eventType.hostGroups && eventType.hostGroups.length > 1) {
    roundRobinReassignLogger.error(
      `Event type ${eventTypeId} has more than one round robin group, reassignment is not allowed`
    );
    throw new Error("Reassignment not allowed with more than one round robin group");
  }

  const eventTypeHosts = eventType.hosts.length
    ? eventType.hosts
    : eventType.users.map((user) => ({
        user,
        isFixed: false,
        priority: 2,
        weight: 100,
        schedule: null,
        createdAt: new Date(0), // use earliest possible date as fallback
        groupId: null,
      }));

  const fixedHost = eventTypeHosts.find((host) => host.isFixed);
  const currentRRHost = booking.attendees.find((attendee) =>
    eventTypeHosts.some((host) => !host.isFixed && host.user.email === attendee.email)
  );
  const newUserHost = eventTypeHosts.find((host) => host.user.id === newUserId);

  if (!newUserHost) {
    throw new Error(ErrorCode.InvalidRoundRobinHost);
  }

  if (newUserHost.isFixed) {
    throw new Error(ErrorCode.UserIsFixed);
  }

  const originalOrganizer = booking.user;
  const hasOrganizerChanged = !fixedHost && booking.userId !== newUserId;
  const newUser = newUserHost.user;
  const newUserT = await getTranslation(newUser.locale || "en", "common");
  const originalOrganizerT = await getTranslation(originalOrganizer.locale || "en", "common");

  const roundRobinHosts = eventType.hosts.filter((host) => !host.isFixed);

  const attendeeEmailsSet = new Set(booking.attendees.map((attendee) => attendee.email));

  // Find the current round robin host assigned
  const previousRRHost = (() => {
    for (const host of roundRobinHosts) {
      if (host.user.id === booking.userId) {
        return host.user;
      }
      if (attendeeEmailsSet.has(host.user.email)) {
        return host.user;
      }
    }
  })();

  const previousRRHostT = await getTranslation(previousRRHost?.locale || "en", "common");
  let bookingLocation = booking.location;
  let conferenceCredentialId: number | null = null;
  if (hasOrganizerChanged) {
    const bookingResponses = booking.responses;
    const responseSchema = getBookingResponsesSchema({
      bookingFields: eventType.bookingFields,
      view: "reschedule",
    });
    const responseSafeParse = await responseSchema.safeParseAsync(bookingResponses);
    const responses = responseSafeParse.success ? responseSafeParse.data : undefined;

    // Determine the location for the new host
    const isManagedEventType = !!eventType.parentId;
    const isTeamEventType = !!eventType.teamId;

    const locationResult = BookingLocationService.getLocationForHost({
      hostMetadata: newUser.metadata,
      eventTypeLocations: eventType.locations,
      isManagedEventType,
      isTeamEventType,
    });

    bookingLocation = locationResult.bookingLocation;
    if (locationResult.requiresActualLink) {
      conferenceCredentialId = locationResult.conferenceCredentialId;
    }

    const newBookingTitle = getEventName({
      attendeeName: responses?.name || "Nameless",
      eventType: eventType.title,
      eventName: eventType.eventName,
      teamName: eventType.team?.name,
      host: newUser.name || "Nameless",
      location: bookingLocation || "integrations:daily",
      bookingFields: { ...responses },
      eventDuration: dayjs(booking.endTime).diff(booking.startTime, "minutes"),
      t: newUserT,
    });

    booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        userId: newUserId,
        title: newBookingTitle,
        userPrimaryEmail: newUser.email,
        reassignReason,
        reassignById: reassignedById,
        idempotencyKey: IdempotencyKeyService.generate({
          startTime: booking.startTime,
          endTime: booking.endTime,
          userId: newUser.id,
          reassignedById,
        }),
      },
      select: bookingSelect,
    });

    await AssignmentReasonRecorder.roundRobinReassignment({
      bookingId,
      reassignReason,
      reassignById: reassignedById,
      reassignmentType: RRReassignmentType.MANUAL,
    });
  } else if (currentRRHost) {
    // Update the round-robin host attendee
    await prisma.attendee.update({
      where: { id: currentRRHost.id },
      data: {
        name: newUser.name || "",
        email: newUser.email,
        timeZone: newUser.timeZone,
        locale: newUser.locale,
      },
    });
  }

  // When organizer hasn't changed, still extract conferenceCredentialId from event type locations
  if (!hasOrganizerChanged && bookingLocation) {
    const { conferenceCredentialId: extractedCredentialId } =
      BookingLocationService.getLocationDetailsFromType({
        locationType: bookingLocation,
        eventTypeLocations: eventType.locations || [],
      });
    if (extractedCredentialId) {
      conferenceCredentialId = extractedCredentialId;
    }
  }

  const destinationCalendar = await getDestinationCalendar({
    eventType,
    booking,
    newUserId,
    hasOrganizerChanged,
  });

  const organizer = hasOrganizerChanged ? newUser : booking.user ?? newUser;

  const organizerT = await getTranslation(organizer?.locale || "en", "common");

  const teamMembers = await getTeamMembers({
    eventTypeHosts,
    attendees: booking.attendees,
    organizer,
    previousHost: previousRRHost || null,
    reassignedHost: newUser,
  });

  const attendeePromises = [];
  for (const attendee of booking.attendees) {
    if (
      attendee.email === newUser.email ||
      attendee.email === previousRRHost?.email ||
      teamMembers.some((member) => member.email === attendee.email)
    ) {
      continue;
    }

    attendeePromises.push(
      getTranslation(attendee.locale ?? "en", "common").then((tAttendee) => ({
        email: attendee.email,
        name: attendee.name,
        timeZone: attendee.timeZone,
        language: { translate: tAttendee, locale: attendee.locale ?? "en" },
        phoneNumber: attendee.phoneNumber || undefined,
      }))
    );
  }

  const attendeeList = await Promise.all(attendeePromises);

  const evt: CalendarEvent = {
    type: eventType.slug,
    title: booking.title,
    description: eventType.description,
    startTime: dayjs(booking.startTime).utc().format(),
    endTime: dayjs(booking.endTime).utc().format(),
    organizer: {
      email: organizer.email,
      name: organizer.name || "",
      timeZone: organizer.timeZone,
      language: { translate: organizerT, locale: organizer.locale || "en" },
    },
    attendees: attendeeList,
    uid: booking.uid,
    iCalUID: booking.iCalUID,
    destinationCalendar,
    team: {
      members: teamMembers,
      name: eventType.team?.name || "",
      id: eventType.team?.id || 0,
    },
    hideOrganizerEmail: eventType.hideOrganizerEmail,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    ...getCalEventResponses({
      bookingFields: eventType.bookingFields ?? null,
      booking,
    }),
    customReplyToEmail: eventType?.customReplyToEmail,
    location: bookingLocation,
    ...(platformClientParams ? platformClientParams : {}),
    conferenceCredentialId: conferenceCredentialId ?? undefined,
  };

  const credentials = await prisma.credential.findMany({
    where: { userId: newUser.id },
    include: { user: { select: { email: true } } },
  });

  const newUserWithCredentials = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...newUser, credentials },
  });

  const previousHostDestinationCalendar = hasOrganizerChanged
    ? await prisma.destinationCalendar.findFirst({
        where: { userId: originalOrganizer.id },
      })
    : null;

  const apps = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);

  // remove the event and meeting using the old host's credentials
  if (hasOrganizerChanged && originalOrganizer.id !== newUser.id) {
    const previousHostCredentials = await getAllCredentialsIncludeServiceAccountKey(
      originalOrganizer,
      eventType
    );

    const originalHostEventManager = new EventManager(
      { ...originalOrganizer, credentials: previousHostCredentials },
      apps
    );

    const deletionEvent: CalendarEvent = {
      ...evt,
      organizer: {
        id: originalOrganizer.id,
        name: originalOrganizer.name || "",
        email: originalOrganizer.email,
        username: originalOrganizer.username || undefined,
        timeZone: originalOrganizer.timeZone,
        language: { translate: originalOrganizerT, locale: originalOrganizer.locale ?? "en" },
        timeFormat: getTimeFormatStringFromUserTimeFormat(originalOrganizer.timeFormat),
      },
      destinationCalendar: previousHostDestinationCalendar ? [previousHostDestinationCalendar] : [],
      title: booking.title,
    };

    await originalHostEventManager.deleteEventsAndMeetings({
      event: deletionEvent,
      bookingReferences: booking.references,
    });
  }

  const { evtWithAdditionalInfo } = await handleRescheduleEventManager({
    evt,
    rescheduleUid: booking.uid,
    newBookingId: undefined,
    changedOrganizer: hasOrganizerChanged,
    previousHostDestinationCalendar: previousHostDestinationCalendar ? [previousHostDestinationCalendar] : [],
    initParams: {
      user: newUserWithCredentials,
      eventType,
    },
    bookingId,
    bookingLocation,
    bookingICalUID: booking.iCalUID,
    bookingMetadata: booking.metadata,
  });

  const { cancellationReason, ...evtWithoutCancellationReason } = evtWithAdditionalInfo;

  // Send emails
  if (emailsEnabled) {
    await sendRoundRobinScheduledEmailsAndSMS({
      calEvent: evtWithoutCancellationReason,
      members: [
        {
          ...newUser,
          name: newUser.name || "",
          username: newUser.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(newUser.timeFormat),
          language: { translate: newUserT, locale: newUser.locale || "en" },
        },
      ],
      reassigned: {
        name: newUser.name,
        email: newUser.email,
        reason: reassignReason,
        byUser: originalOrganizer.name || undefined,
      },
    });
  }

  // Send cancellation email to previous RR host
  const cancelledEvt = cloneDeep(evtWithAdditionalInfo);
  cancelledEvt.organizer = {
    email: originalOrganizer.email,
    name: originalOrganizer.name || "",
    timeZone: originalOrganizer.timeZone,
    language: { translate: originalOrganizerT, locale: originalOrganizer.locale || "en" },
  };

  if (previousRRHost && emailsEnabled) {
    await sendRoundRobinReassignedEmailsAndSMS({
      calEvent: cancelledEvt,
      members: [
        {
          ...previousRRHost,
          name: previousRRHost.name || "",
          username: previousRRHost.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
          language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
        },
      ],
      reassignedTo: { name: newUser.name, email: newUser.email },
      eventTypeMetadata: eventType?.metadata as EventTypeMetadata,
    });
  }

  if (hasOrganizerChanged) {
    if (emailsEnabled && dayjs(evt.startTime).isAfter(dayjs())) {
      // send email with event updates to attendees
      await sendRoundRobinUpdatedEmailsAndSMS({
        calEvent: evtWithoutCancellationReason,
        eventTypeMetadata: eventType?.metadata as EventTypeMetadata,
      });
    }

    // Handle changing workflows with organizer
    await handleWorkflowsUpdate({
      booking,
      newUser,
      evt: evtWithAdditionalInfo,
      eventType,
      orgId,
    });
  }

  return booking;
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
  const workflowReminders = await prisma.workflowReminder.findMany({
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
              teamId: true,
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

  const workflowEventMetadata = { videoCallUrl: getVideoCallUrlFromCalEvent(evt) };
  const bookerUrl = await getBookerBaseUrl(orgId);

  for (const workflowReminder of workflowReminders) {
    const workflowStep = workflowReminder.workflowStep;

    if (workflowStep) {
      const workflow = workflowStep.workflow;
      await scheduleEmailReminder({
        evt: {
          ...evt,
          metadata: workflowEventMetadata,
          eventType,
          bookerUrl,
        },
        action: WorkflowActions.EMAIL_HOST,
        triggerEvent: workflow.trigger,
        timeSpan: {
          time: workflow.time,
          timeUnit: workflow.timeUnit,
        },
        sendTo: [newUser.email],
        template: workflowStep.template,
        emailSubject: workflowStep.emailSubject || undefined,
        emailBody: workflowStep.reminderBody || undefined,
        sender: workflowStep.sender || SENDER_NAME,
        hideBranding: true,
        includeCalendarEvent: workflowStep.includeCalendarEvent,
        workflowStepId: workflowStep.id,
        verifiedAt: workflowStep.verifiedAt,
      });
    }

    await deleteScheduledEmailReminder(workflowReminder.id);
  }

  // Send new event workflows to new organizer
  const newEventWorkflows = await prisma.workflow.findMany({
    where: {
      trigger: WorkflowTriggerEvents.NEW_EVENT,
      OR: [
        {
          isActiveOnAll: true,
          teamId: eventType?.teamId,
        },
        {
          activeOn: {
            some: {
              eventTypeId: eventType.id,
            },
          },
        },
        ...(eventType?.teamId
          ? [
              {
                activeOnTeams: {
                  some: {
                    teamId: eventType.teamId,
                  },
                },
              },
            ]
          : []),
        ...(eventType?.team?.parentId
          ? [
              {
                isActiveOnAll: true,
                teamId: eventType.team.parentId,
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
    workflows: newEventWorkflows,
    smsReminderNumber: null,
    calendarEvent: {
      ...evt,
      metadata: workflowEventMetadata,
      eventType: { slug: eventType.slug },
      bookerUrl,
    },
    hideBranding: !!eventType?.owner?.hideBranding,
  });
}

export default roundRobinManualReassignment;
