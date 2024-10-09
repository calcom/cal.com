// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { OrganizerDefaultConferencingAppType, getLocationValueForDB } from "@calcom/app-store/locations";
import EventManager from "@calcom/core/EventManager";
import { getEventName } from "@calcom/core/event";
import dayjs from "@calcom/dayjs";
import { sendRoundRobinCancelledEmailsAndSMS, sendRoundRobinScheduledEmailsAndSMS } from "@calcom/emails";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import {
  scheduleEmailReminder,
  deleteScheduledEmailReminder,
} from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

const bookingSelect = {
  uid: true,
  title: true,
  startTime: true,
  endTime: true,
  userId: true,
  customInputs: true,
  responses: true,
  description: true,
  location: true,
  eventTypeId: true,
  destinationCalendar: true,
  user: {
    include: {
      destinationCalendar: true,
    },
  },
  attendees: true,
  references: true,
};

export const roundRobinReassignment = async ({
  bookingId,
  orgId,
}: {
  bookingId: number;
  orgId: number | null;
}) => {
  const roundRobinReassignLogger = logger.getSubLogger({
    prefix: ["roundRobinReassign", `${bookingId}`],
  });

  let booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: bookingSelect,
  });

  if (!booking) {
    roundRobinReassignLogger.error(`Booking ${bookingId} not found`);
    throw new Error("Booking not found");
  }

  if (!booking?.user) {
    roundRobinReassignLogger.error(`No user associated with booking ${bookingId}`);
    throw new Error("Booking not found");
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

  eventType.hosts = eventType.hosts.length
    ? eventType.hosts
    : eventType.users.map((user) => ({
        user,
        isFixed: false,
        priority: 2,
        weight: 100,
        weightAdjustment: 0,
      }));

  const roundRobinHosts = eventType.hosts.filter((host) => !host.isFixed);

  const originalOrganizer = booking.user;

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

  // Filter out the current attendees of the booking from the event type
  const availableEventTypeUsers = eventType.hosts.reduce((availableUsers, host) => {
    if (!attendeeEmailsSet.has(host.user.email) && host.user.email !== originalOrganizer.email) {
      availableUsers.push({ ...host.user, isFixed: host.isFixed, priority: host?.priority ?? 2 });
    }
    return availableUsers;
  }, [] as IsFixedAwareUser[]);

  const availableUsers = await ensureAvailableUsers(
    { ...eventType, users: availableEventTypeUsers },
    {
      dateFrom: dayjs(booking.startTime).format(),
      dateTo: dayjs(booking.endTime).format(),
      timeZone: eventType.timeZone || originalOrganizer.timeZone,
    },
    roundRobinReassignLogger
  );

  const reassignedRRHost = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
    availableUsers,
    eventType: {
      id: eventTypeId,
      isRRWeightsEnabled: eventType.isRRWeightsEnabled,
    },
    allRRHosts: eventType.hosts.filter((host) => !host.isFixed),
  });

  const hasOrganizerChanged = !previousRRHost || booking.userId === previousRRHost?.id;
  const organizer = hasOrganizerChanged ? reassignedRRHost : booking.user;
  const organizerT = await getTranslation(organizer?.locale || "en", "common");

  const currentBookingTitle = booking.title;
  let newBookingTitle = currentBookingTitle;

  const reassignedRRHostT = await getTranslation(reassignedRRHost.locale || "en", "common");

  const teamMemberPromises = [];
  for (const teamMember of eventType.hosts) {
    const user = teamMember.user;
    // Need to skip over the reassigned user and the organizer user
    if (user.email === previousRRHost?.email || user.email === organizer.email) {
      continue;
    }

    // Check that the team member is a part of the booking
    if (booking.attendees.some((attendee) => attendee.email === user.email)) {
      teamMemberPromises.push(
        getTranslation(user.locale ?? "en", "common").then((tTeamMember) => ({
          id: user.id,
          email: user.email,
          name: user.name || "",
          timeZone: user.timeZone,
          language: { translate: tTeamMember, locale: user.locale ?? "en" },
        }))
      );
    }
  }

  const teamMembers = await Promise.all(teamMemberPromises);
  // Assume the RR host was labelled as a team member
  if (reassignedRRHost.email !== organizer.email) {
    teamMembers.push({
      id: reassignedRRHost.id,
      email: reassignedRRHost.email,
      name: reassignedRRHost.name || "",
      timeZone: reassignedRRHost.timeZone,
      language: { translate: reassignedRRHostT, locale: reassignedRRHost.locale ?? "en" },
    });
  }

  const attendeePromises = [];
  for (const attendee of booking.attendees) {
    if (
      attendee.email === reassignedRRHost.email ||
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

  if (hasOrganizerChanged) {
    const bookingResponses = booking.responses;

    const responseSchema = getBookingResponsesSchema({
      bookingFields: eventType.bookingFields,
      view: "reschedule",
    });

    const responseSafeParse = await responseSchema.safeParseAsync(bookingResponses);

    const responses = responseSafeParse.success ? responseSafeParse.data : undefined;

    let bookingLocation = booking.location;

    if (eventType.locations.includes({ type: OrganizerDefaultConferencingAppType })) {
      const organizerMetadataSafeParse = userMetadataSchema.safeParse(reassignedRRHost.metadata);

      const defaultLocationUrl = organizerMetadataSafeParse.success
        ? organizerMetadataSafeParse?.data?.defaultConferencingApp?.appLink
        : undefined;

      const currentBookingLocation = booking.location || "integrations:daily";

      bookingLocation =
        defaultLocationUrl ||
        getLocationValueForDB(currentBookingLocation, eventType.locations).bookingLocation;
    }

    const eventNameObject = {
      attendeeName: responses?.name || "Nameless",
      eventType: eventType.title,
      eventName: eventType.eventName,
      // we send on behalf of team if >1 round robin attendee | collective
      teamName: teamMembers.length > 1 ? eventType.team?.name : null,
      // TODO: Can we have an unnamed organizer? If not, I would really like to throw an error here.
      host: organizer.name || "Nameless",
      location: bookingLocation || "integrations:daily",
      bookingFields: { ...responses },
      eventDuration: eventType.length,
      t: organizerT,
    };

    newBookingTitle = getEventName(eventNameObject);

    booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId: reassignedRRHost.id,
        title: newBookingTitle,
      },
      select: bookingSelect,
    });
  } else {
    const previousRRHostAttendee = booking.attendees.find(
      (attendee) => attendee.email === previousRRHost.email
    );
    await prisma.attendee.update({
      where: {
        id: previousRRHostAttendee!.id,
      },
      data: {
        name: reassignedRRHost.name || "",
        email: reassignedRRHost.email,
        timeZone: reassignedRRHost.timeZone,
        locale: reassignedRRHost.locale,
      },
    });
  }

  const destinationCalendar = await (async () => {
    if (eventType?.destinationCalendar) {
      return [eventType.destinationCalendar];
    }

    if (hasOrganizerChanged) {
      const organizerDestinationCalendar = await prisma.destinationCalendar.findFirst({
        where: {
          userId: reassignedRRHost.id,
        },
      });
      if (organizerDestinationCalendar) {
        return [organizerDestinationCalendar];
      }
    } else {
      if (booking.user?.destinationCalendar) return [booking.user?.destinationCalendar];
    }
  })();

  // If changed owner, also change destination calendar
  const previousHostDestinationCalendar = hasOrganizerChanged
    ? await prisma.destinationCalendar.findFirst({
        where: {
          userId: originalOrganizer.id,
        },
      })
    : null;

  const evt: CalendarEvent = {
    organizer: {
      name: organizer.name || "",
      email: organizer.email,
      language: {
        locale: organizer.locale || "en",
        translate: organizerT,
      },
      timeZone: organizer.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizer.timeFormat),
    },
    startTime: dayjs(booking.startTime).utc().format(),
    endTime: dayjs(booking.endTime).utc().format(),
    type: eventType.slug,
    title: newBookingTitle,
    description: eventType.description,
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
      bookingFields: eventType?.bookingFields ?? null,
      booking,
    }),
  };

  const credentials = await prisma.credential.findMany({
    where: {
      userId: organizer.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });
  const eventManager = new EventManager({ ...organizer, credentials: [...credentials] });

  const results = await eventManager.reschedule(
    evt,
    booking.uid,
    undefined,
    hasOrganizerChanged,
    previousHostDestinationCalendar ? [previousHostDestinationCalendar] : []
  );

  let newReferencesToCreate = [];
  newReferencesToCreate = structuredClone(results.referencesToCreate);

  await BookingReferenceRepository.replaceBookingReferences({
    bookingId,
    newReferencesToCreate,
  });

  // Send to new RR host
  await sendRoundRobinScheduledEmailsAndSMS(evt, [
    {
      ...reassignedRRHost,
      name: reassignedRRHost.name || "",
      username: reassignedRRHost.username || "",
      timeFormat: getTimeFormatStringFromUserTimeFormat(reassignedRRHost.timeFormat),
      language: { translate: reassignedRRHostT, locale: reassignedRRHost.locale || "en" },
    },
  ]);

  if (previousRRHost) {
    // Send to cancelled RR host
    // First we need to replace the new RR host with the old RR host in the evt object
    const cancelledRRHostEvt = cloneDeep(evt);
    cancelledRRHostEvt.title = currentBookingTitle;
    if (hasOrganizerChanged) {
      cancelledRRHostEvt.organizer = {
        name: previousRRHost.name || "",
        email: previousRRHost.email,
        language: {
          locale: previousRRHost.locale || "en",
          translate: previousRRHostT,
        },
        timeZone: previousRRHost.timeZone,
        timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
      };
    } else if (cancelledRRHostEvt.team) {
      // Filter out the new RR host from attendees and add the old RR host
      const newMembersArray = cancelledRRHostEvt.team?.members || [];
      cancelledRRHostEvt.team.members = newMembersArray.filter(
        (member) => member.email !== reassignedRRHost.email
      );
      cancelledRRHostEvt.team.members.unshift({
        id: previousRRHost.id,
        email: previousRRHost.email,
        name: previousRRHost.name || "",
        timeZone: previousRRHost.timeZone,
        language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
      });
    }

    await sendRoundRobinCancelledEmailsAndSMS(
      cancelledRRHostEvt,
      [
        {
          ...previousRRHost,
          name: previousRRHost.name || "",
          username: previousRRHost.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
          language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
        },
      ],
      eventType?.metadata as EventTypeMetadata
    );
  }

  // Handle changing workflows with organizer
  if (hasOrganizerChanged) {
    const workflowReminders = await prisma.workflowReminder.findMany({
      where: {
        bookingUid: booking.uid,
        method: WorkflowMethods.EMAIL,
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
            template: true,
            workflow: {
              select: {
                trigger: true,
                time: true,
                timeUnit: true,
              },
            },
          },
        },
      },
    });

    const workflowEventMetadata = { videoCallUrl: getVideoCallUrlFromCalEvent(evt) };

    const bookerUrl = await getBookerBaseUrl(orgId);

    for (const workflowReminder of workflowReminders) {
      const workflowStep = workflowReminder?.workflowStep;
      const workflow = workflowStep?.workflow;

      if (workflowStep && workflow) {
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
          sendTo: reassignedRRHost.email,
          template: workflowStep.template,
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
                eventTypeId: eventTypeId,
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
};

export default roundRobinReassignment;
