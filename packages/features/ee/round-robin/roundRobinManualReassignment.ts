// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { OrganizerDefaultConferencingAppType, getLocationValueForDB } from "@calcom/app-store/locations";
import { getEventName } from "@calcom/core/event";
import dayjs from "@calcom/dayjs";
import {
  sendRoundRobinCancelledEmailsAndSMS,
  sendRoundRobinScheduledEmailsAndSMS,
  sendRoundRobinUpdatedEmailsAndSMS,
} from "@calcom/emails";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import AssignmentReasonRecorder from "@calcom/features/ee/round-robin/assignmentReason/AssignmentReasonRecorder";
import {
  scheduleEmailReminder,
  deleteScheduledEmailReminder,
} from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { SENDER_NAME } from "@calcom/lib/constants";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
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

  const eventTypeHosts = eventType.hosts.length
    ? eventType.hosts
    : eventType.users.map((user) => ({
        user,
        isFixed: false,
        priority: 2,
        weight: 100,
        schedule: null,
        createdAt: new Date(0), // use earliest possible date as fallback
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

  if (hasOrganizerChanged) {
    const bookingResponses = booking.responses;
    const responseSchema = getBookingResponsesSchema({
      bookingFields: eventType.bookingFields,
      view: "reschedule",
    });
    const responseSafeParse = await responseSchema.safeParseAsync(bookingResponses);
    const responses = responseSafeParse.success ? responseSafeParse.data : undefined;

    if (eventType.locations.some((location) => location.type === OrganizerDefaultConferencingAppType)) {
      const newUserMetadataSafeParse = userMetadataSchema.safeParse(newUser.metadata);
      const defaultLocationUrl = newUserMetadataSafeParse.success
        ? newUserMetadataSafeParse?.data?.defaultConferencingApp?.appLink
        : undefined;
      const currentBookingLocation = booking.location || "integrations:daily";
      bookingLocation =
        defaultLocationUrl ||
        getLocationValueForDB(currentBookingLocation, eventType.locations).bookingLocation;
    }

    const newBookingTitle = getEventName({
      attendeeName: responses?.name || "Nameless",
      eventType: eventType.title,
      eventName: eventType.eventName,
      teamName: eventType.team?.name,
      host: newUser.name || "Nameless",
      location: bookingLocation || "integrations:daily",
      bookingFields: { ...responses },
      eventDuration: eventType.length,
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
      },
      select: bookingSelect,
    });

    await AssignmentReasonRecorder.roundRobinReassignment({
      bookingId,
      reassignReason,
      reassignById: reassignedById,
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
    destinationCalendar,
    team: {
      members: teamMembers,
      name: eventType.team?.name || "",
      id: eventType.team?.id || 0,
    },
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    ...getCalEventResponses({
      bookingFields: eventType.bookingFields ?? null,
      booking,
    }),
    location: bookingLocation,
    ...(platformClientParams ? platformClientParams : {}),
  };

  const credentials = await prisma.credential.findMany({
    where: { userId: newUser.id },
    include: { user: { select: { email: true } } },
  });

  const previousHostDestinationCalendar = hasOrganizerChanged
    ? await prisma.destinationCalendar.findFirst({
        where: { userId: originalOrganizer.id },
      })
    : null;

  const { evtWithAdditionalInfo } = await handleRescheduleEventManager({
    evt,
    rescheduleUid: booking.uid,
    newBookingId: undefined,
    changedOrganizer: hasOrganizerChanged,
    previousHostDestinationCalendar: previousHostDestinationCalendar ? [previousHostDestinationCalendar] : [],
    initParams: {
      user: { ...newUser, credentials },
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
    await sendRoundRobinCancelledEmailsAndSMS(
      cancelledEvt,
      [
        {
          ...previousRRHost,
          name: previousRRHost.name || "",
          username: previousRRHost.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
          language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
        },
      ],
      eventType?.metadata as EventTypeMetadata,
      { name: newUser.name, email: newUser.email }
    );
  }

  if (hasOrganizerChanged) {
    if (emailsEnabled) {
      // send email with event updates to attendees
      await sendRoundRobinUpdatedEmailsAndSMS({
        calEvent: evtWithoutCancellationReason,
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

async function handleWorkflowsUpdate({
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
              trigger: true,
              time: true,
              timeUnit: true,
            },
          },
          emailSubject: true,
          reminderBody: true,
          sender: true,
          includeCalendarEvent: true,
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
        sendTo: newUser.email,
        template: workflowStep.template,
        emailSubject: workflowStep.emailSubject || undefined,
        emailBody: workflowStep.reminderBody || undefined,
        sender: workflowStep.sender || SENDER_NAME,
        hideBranding: true,
        includeCalendarEvent: workflowStep.includeCalendarEvent,
        workflowStepId: workflowStep.id,
      });
    }

    await deleteScheduledEmailReminder(workflowReminder.id, workflowReminder.referenceId);
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
