import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendRoundRobinCancelledEmails, sendRoundRobinScheduledEmails } from "@calcom/emails";
import { ensureAvailableUsers, getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking";
import type { User } from "@calcom/features/bookings/lib/handleNewBooking";
import { scheduleEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const roundRobinReassignment = async ({
  eventTypeId,
  bookingId,
}: {
  eventTypeId: number;
  bookingId: number;
}) => {
  const roundRobinReassignLogger = logger.getSubLogger({
    prefix: ["roundRobinReassign", `${bookingId}`],
  });

  const eventType = await getEventTypesFromDB(eventTypeId);

  if (!eventType) {
    console.error(`Event type ${eventTypeId} not found`);
    throw new Error("Event type not found");
  }

  eventType.users = eventType.hosts.map((host) => ({ ...host.user }));

  const roundRobinHosts = eventType.hosts.filter((host) => !host.isFixed);

  let booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      uid: true,
      title: true,
      startTime: true,
      endTime: true,
      userId: true,
      customInputs: true,
      responses: true,
      destinationCalendar: true,
      user: {
        include: {
          destinationCalendar: true,
        },
      },
      attendees: {
        select: {
          id: true,
          email: true,
          name: true,
          timeZone: true,
          locale: true,
        },
      },
      references: {
        select: {
          credentialId: true,
        },
      },
    },
  });

  if (!booking) {
    console.error(`Booking ${bookingId} not found`);
    throw new Error("Booking not found");
  }

  if (!booking?.user) {
    console.error(`No user associated with booking ${bookingId}`);
    throw new Error("Booking not found");
  }

  const originalOrganizer = booking.user;

  const attendeeEmailsSet = new Set(booking.attendees.map((attendee) => attendee.email));

  // Find the current round robin host assigned
  const previousRRHost = (() => {
    for (const host of roundRobinHosts) {
      if (host.userId === booking.userId) {
        return host.user;
      }
      if (attendeeEmailsSet.has(host.user.email)) {
        return host.user;
      }
    }
  })();

  const previousRRHostT = await getTranslation(previousRRHost?.locale || "en", "common");

  // Filter out the current attendees of the booking from the event type
  const availableEventTypeUsers = eventType.users.reduce((availableUsers, user) => {
    if (
      !booking?.attendees.some((attendee) => attendee.email === user.email) &&
      user.email !== originalOrganizer.email
    ) {
      availableUsers.push(user);
    }
    return availableUsers;
  }, [] as User[]);

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

  const hasOrganizerChanged = booking.userId === previousRRHost;
  const organizer = hasOrganizerChanged ? reassignedRRHost : booking.user;
  const organizerT = await getTranslation((organizer?.locale || "en", "common"));

  // See if user is the assigned user or an attendee
  if (hasOrganizerChanged) {
    booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId: reassignedRRHost.id,
      },
      include: {
        user: true,
        attendees: true,
        references: true,
        destinationCalendar: true,
      },
    });
  } else {
    const previousRRHostAttendee = booking.attendees.find(
      (attendee) => attendee.email === previousRRHost.email
    );
    await prisma.attendee.update({
      where: {
        id: previousRRHostAttendee.id,
      },
      data: {
        name: reassignedRRHost.name,
        email: reassignedRRHost.email,
        timeZone: reassignedRRHost.timeZone,
        locale: reassignedRRHost.locale,
      },
    });
  }

  const reassignedRRHostDestinationCalendar = await prisma.destinationCalendar.findFirst({
    where: {
      userId: reassignedRRHost.id,
    },
  });

  const reassignedRRHostT = await getTranslation(reassignedRRHost.locale || "en", "common");

  const teamMemberPromises = [];
  for (const teamMember of eventType.hosts) {
    const user = teamMember.user;
    // Need to skip over the reassigned user and the lucky user
    if (user.email === previousRRHost.email || user.email === organizer.email) {
      continue;
    }

    if (attendeeEmailsSet.has(user.email)) {
      const tTeamMember = await getTranslation(user.locale ?? "en", "common");

      teamMemberPromises.push({
        id: user.id,
        email: user.email,
        name: user.name || "",
        timeZone: user.timeZone,
        language: { translate: tTeamMember, locale: user.locale ?? "en" },
      });
    }
  }

  const teamMembers = await Promise.all(teamMemberPromises);
  console.log("🚀 ~ teamMembers:", teamMembers);

  // Assume the RR host was labelled as a team member
  if (reassignedRRHost.email !== organizer.email) {
    teamMembers.push({
      id: reassignedRRHost.id,
      email: reassignedRRHost.email,
      name: reassignedRRHost.name,
      timeZone: reassignedRRHost.timeZone,
      language: { translate: reassignedRRHostT, locale: reassignedRRHost.locale ?? "en" },
    });
  }
  console.log("🚀 ~ teamMembers:", teamMembers);

  console.log("🚀 ~ previousRRHost.user:", previousRRHost);
  console.log("🚀 ~ reassignedRRHost.user:", reassignedRRHost);

  const attendeePromises = [];
  for (const attendee of booking.attendees) {
    if (
      attendee.email === reassignedRRHost.email ||
      attendee.email === previousRRHost.email ||
      teamMembers.some((member) => member.email === attendee.email)
    ) {
      continue;
    }
    const tAttendee = getTranslation(attendee.locale ?? "en", "common");

    attendeePromises.push({
      email: attendee.email,
      name: attendee.name,
      timeZone: attendee.timeZone,
      language: { translate: tAttendee, locale: attendee.locale ?? "en" },
    });
  }

  const attendeeList = await Promise.all(attendeePromises);
  console.log("🚀 ~ attendeeList:", attendeeList);

  const destinationCalendar = await (async () => {
    if (eventType?.destinationCalendar) {
      return [eventType.destinationCalendar];
    }

    if (hasOrganizerChanged) {
      return await prisma.destinationCalendar.findMany({
        where: {
          userId: reassignedRRHost,
        },
      });
    } else {
      return [booking.user?.destinationCalendar];
    }
  })();

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
    customInputs: booking.customInputs,
    userFieldsResponses: booking.responses,
  };

  // If changed owner, also change destination calendar
  const previousHostDestinationCalendar = await prisma.destinationCalendar.findFirst({
    where: {
      userId: originalOrganizer.id,
    },
  });

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

  // See if the reassigned member is the organizer
  const eventManager = new EventManager({ ...organizer, credentials: [...credentials] });

  await eventManager.reschedule(evt, booking.uid, undefined, hasOrganizerChanged, [
    previousHostDestinationCalendar,
  ]);

  // Send to new RR host
  await sendRoundRobinScheduledEmails(evt, [
    {
      ...reassignedRRHost,
      timeFormat: getTimeFormatStringFromUserTimeFormat(reassignedRRHost.timeFormat),
      language: { translate: reassignedRRHostT, locale: reassignedRRHost.locale || "en" },
    },
  ]);
  // Send to cancelled RR host
  await sendRoundRobinCancelledEmails(evt, [
    {
      ...previousRRHost,
      timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
      language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
    },
  ]);

  // Handle only email host workflows
  const workflows = await prisma.workflow.findMany({
    where: {
      OR: [
        {
          trigger: WorkflowTriggerEvents.NEW_EVENT,
        },
        {
          trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        },
      ],
      activeOn: {
        some: {
          eventTypeId: eventType.id,
        },
      },
      steps: {
        some: {
          action: WorkflowActions.EMAIL_HOST,
        },
      },
    },
    include: {
      steps: true,
    },
  });

  for (const workflow of workflows) {
    // Only trigger new host step
    workflow.steps = workflow.steps.filter((step) => step.action === WorkflowActions.EMAIL_HOST);

    for (const step of workflow.steps) {
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
        template: step.template,
      });
    }
  }

  // TODO create relationship between reminder and userId in order to determine which one to delete
  // deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
};

export default roundRobinReassignment;
