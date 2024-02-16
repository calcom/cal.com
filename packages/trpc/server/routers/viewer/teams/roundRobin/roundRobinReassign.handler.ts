import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendRoundRobinCancelledEmails, sendRoundRobinScheduledEmails } from "@calcom/emails";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking";
import { scheduleEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";

type RoundRobinReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinReassignInputSchema;
};

export const roundRobinReassignHandler = async ({ ctx, input }: RoundRobinReassignOptions) => {
  const { eventTypeId, bookingId } = input;

  const roundRobinReassignLogger = logger.getSubLogger({
    prefix: ["roundRobinReassign", `${bookingId}`],
  });
  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      availability: true,
      slug: true,
      description: true,
      destinationCalendar: true,
      hosts: {
        select: {
          user: {
            include: {
              schedules: {
                include: {
                  availability: true,
                },
              },
            },
          },
        },
      },
      users: {
        select: {
          id: true,
        },
      },
      team: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  eventType.users = eventType.hosts.map((host) => ({ ...host.user }));

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
      attendees: {
        select: {
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
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const availableUsers = await ensureAvailableUsers(
    eventType,
    {
      dateFrom: dayjs(booking.startTime).format(),
      dateTo: dayjs(booking.endTime).format(),
      timeZone: "",
    },
    roundRobinReassignLogger
  );

  const luckyUser = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
    availableUsers,
    eventTypeId: eventTypeId,
  });

  // See if user is the assigned user or an attendee

  booking = await prisma.booking.update({
    where: {
      id: bookingId,
    },
    data: {
      userId: luckyUser.id,
    },
    include: {
      attendees: true,
      references: true,
      destinationCalendar: true,
    },
  });

  const luckyUserT = await getTranslation(luckyUser.locale || "en", "common");

  const teamMemberPromises = [];
  for (const teamMember of eventType.hosts) {
    const user = teamMember.user;
    // Need to skip over the reassigned user and the lucky user
    if (user.email === luckyUser.email || user.email === ctx.user.email) {
      continue;
    }
    const tTeamMember = await getTranslation(user.locale ?? "en", "common");

    teamMemberPromises.push({
      id: user.id,
      email: user.email,
      name: user.name || "",
      timeZone: user.timeZone,
      language: { translate: tTeamMember, locale: user.locale ?? "en" },
    });
  }

  const teamMembers = await Promise.all(teamMemberPromises);

  const attendeePromises = [];
  for (const attendee of booking.attendees) {
    if (
      attendee.email === luckyUser.email ||
      attendee.email === ctx.user.email ||
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

  const evt: CalendarEvent = {
    organizer: {
      name: luckyUser.name || "",
      email: luckyUser.email,
      language: {
        locale: luckyUser.locale || "en",
        translate: luckyUserT,
      },
      timeZone: luckyUser.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(luckyUser.timeFormat),
    },
    startTime: dayjs(booking.startTime).utc().format(),
    endTime: dayjs(booking.endTime).utc().format(),
    type: eventType.slug,
    title: booking.title,
    description: eventType.description,
    attendees: attendeeList,
    uid: booking.uid,
    destinationCalendar: [booking.destinationCalendar] || [eventType.destinationCalendar] || null,
    team: {
      members: teamMembers,
      name: eventType.team?.name || "",
      id: eventType.team?.id || 0,
    },
    customInputs: booking.customInputs,
    userFieldsResponses: booking.responses,
    // TODO complete this evt object
  };

  // If changed owner, also change destination calendar
  const newDestinationCalendar = await prisma.destinationCalendar.findFirst({
    where: {
      userId: luckyUser.id,
    },
  });

  if (!newDestinationCalendar) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const credentials = await prisma.credential.findMany({
    where: {
      userId: luckyUser.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  // TODO: update calendar event
  // See if the reassigned member is the organizer
  const eventManager = new EventManager({ ...luckyUser, credentials: [...credentials] });

  await eventManager.reschedule(evt, booking.uid, undefined, true, [newDestinationCalendar]);

  // Send to new RR host
  sendRoundRobinScheduledEmails(evt, [
    { ...luckyUser, language: { translate: luckyUserT, locale: luckyUser.locale || "en" } },
  ]);
  // Send to cancelled RR host
  sendRoundRobinCancelledEmails(evt, [
    { ...ctx.user, language: { translate: luckyUserT, locale: ctx.user.locale || "en" } },
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
        sendTo: luckyUser.email,
        template: step.template,
      });
    }
  }

  // TODO create relationship between reminder and userId in order to determine which one to delete
  // deleteScheduledEmailReminder(reminder.id, reminder.referenceId);

  return;
};

export default roundRobinReassignHandler;
