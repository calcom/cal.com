import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendRoundRobinCancelledEmails, sendRoundRobinScheduledEmails } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import {
  scheduleEmailReminder,
  deleteScheduledEmailReminder,
} from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
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

export const roundRobinReassignment = async ({ bookingId }: { bookingId: number }) => {
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
    : eventType.users.map((user) => ({ user, isFixed: false, priority: 2 }));

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

  if (!previousRRHost) {
    roundRobinReassignLogger.error(`Could not find RR host associated with booking ${bookingId}`);
    throw new Error("Host not found");
  }

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
    eventTypeId: eventTypeId,
  });
  const hasOrganizerChanged = booking.userId === previousRRHost.id;
  const organizer = hasOrganizerChanged ? reassignedRRHost : booking.user;
  const organizerT = await getTranslation(organizer?.locale || "en", "common");

  if (hasOrganizerChanged) {
    booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId: reassignedRRHost.id,
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

  const reassignedRRHostT = await getTranslation(reassignedRRHost.locale || "en", "common");

  const teamMemberPromises = [];
  for (const teamMember of eventType.hosts) {
    const user = teamMember.user;
    // Need to skip over the reassigned user and the organizer user
    if (user.email === previousRRHost.email || user.email === organizer.email) {
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
      attendee.email === previousRRHost.email ||
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
      }))
    );
  }

  const attendeeList = await Promise.all(attendeePromises);

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
    title: booking.title,
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

  await eventManager.reschedule(
    evt,
    booking.uid,
    undefined,
    hasOrganizerChanged,
    previousHostDestinationCalendar ? [previousHostDestinationCalendar] : []
  );

  // Send to new RR host
  await sendRoundRobinScheduledEmails(evt, [
    {
      ...reassignedRRHost,
      name: reassignedRRHost.name || "",
      username: reassignedRRHost.username || "",
      timeFormat: getTimeFormatStringFromUserTimeFormat(reassignedRRHost.timeFormat),
      language: { translate: reassignedRRHostT, locale: reassignedRRHost.locale || "en" },
    },
  ]);
  // Send to cancelled RR host
  await sendRoundRobinCancelledEmails(evt, [
    {
      ...previousRRHost,
      name: previousRRHost.name || "",
      username: previousRRHost.username || "",
      timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
      language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
    },
  ]);

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
      include: {
        workflowStep: {
          include: {
            workflow: true,
          },
        },
      },
    });

    for (const workflowReminder of workflowReminders) {
      const workflowStep = workflowReminder?.workflowStep;
      const workflow = workflowStep?.workflow;

      if (workflowStep && workflow) {
        await scheduleEmailReminder({
          evt: {
            ...evt,
            eventType,
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
  }
};

export default roundRobinReassignment;
