import dayjs from "@calcom/dayjs";
import { sendRoundRobinCancelledEmails, sendRoundRobinScheduledEmails } from "@calcom/emails";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
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
      attendees: {
        select: {
          email: true,
          name: true,
          timeZone: true,
          locale: true,
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
  if (booking.userId === ctx.user.id) {
    booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId: luckyUser.id,
      },
      include: {
        attendees: true,
      },
    });
  } else if (booking.attendees.some((attendee) => attendee.email === ctx.user.email)) {
    console.log("booking is connected to attendee");
  } else {
    console.log("user is not in the booking");
  }

  const t = await getTranslation(luckyUser.locale || "en", "common");

  const teamMembers = await Promise.all(
    eventType.hosts.map(async (teamMember) => {
      const user = teamMember.user;
      const tTeamMember = await getTranslation(user.locale ?? "en", "common");

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        timeZone: user.timeZone,
        language: { translate: tTeamMember, locale: user.locale ?? "en" },
      };
    })
  );

  const attendeeList = await Promise.all(
    booking.attendees.map(async (attendee) => {
      const tAttendee = await getTranslation(attendee.locale ?? "en", "common");

      return {
        email: attendee.email,
        name: attendee.name,
        timeZone: attendee.timeZone,
        language: { translate: tAttendee, locale: attendee.locale ?? "en" },
      };
    })
  );

  const evt: CalendarEvent = {
    organizer: {
      name: luckyUser.name || "",
      email: luckyUser.email,
      language: {
        locale: luckyUser.locale || "en",
        translate: t,
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
    team: {
      members: teamMembers,
      name: eventType.team?.name,
      id: eventType.team?.id,
    },
    customInputs: booking.customInputs,
    userFieldsResponses: booking.responses,
    // TODO complete this evt object
  };

  // Send to new RR host
  sendRoundRobinScheduledEmails(evt, [
    { ...luckyUser, language: { translate: t, locale: luckyUser.locale || "en" } },
  ]);
  // Send to cancelled RR host
  sendRoundRobinCancelledEmails(evt, [
    { ...ctx.user, language: { translate: t, locale: ctx.user.locale || "en" } },
  ]);

  return;
};

export default roundRobinReassignHandler;
