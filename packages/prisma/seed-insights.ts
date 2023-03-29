import type { Prisma } from "@prisma/client";
import { BookingStatus, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";

const shuffle = (
  booking: any,
  year: number,
  eventTypesToPick: Prisma.EventTypeGetPayload<{
    select: {
      id: true;
      length: true;
    };
  }>[],
  usersIdsToPick?: number[]
) => {
  const startTime = dayjs(booking.startTime)
    .add(Math.floor(Math.random() * 365), "day")
    .add(Math.floor(Math.random() * 24), "hour")
    .add(Math.floor(Math.random() * 60), "minute")
    .set("y", year);
  const randomEvent = eventTypesToPick[Math.floor(Math.random() * eventTypesToPick.length)];
  const endTime = dayjs(startTime).add(Math.floor(Math.random() * randomEvent.length), "minute");

  booking.startTime = startTime.toISOString();
  booking.endTime = endTime.toISOString();
  booking.createdAt = startTime.subtract(1, "day").toISOString();

  // Pick a random status
  const randomStatusIndex = Math.floor(Math.random() * Object.keys(BookingStatus).length);
  const statusKey = Object.keys(BookingStatus)[randomStatusIndex];

  booking.status = BookingStatus[statusKey];

  booking.rescheduled = Math.random() > 0.5 && Math.random() > 0.5 && Math.random() > 0.5;

  if (booking.rescheduled) {
    booking.status = "CANCELLED";
  }
  const randomEventTypeId = randomEvent.id;

  booking.eventTypeId = randomEventTypeId;
  booking.uid = uuidv4();

  if (usersIdsToPick && usersIdsToPick.length > 0) {
    booking.userId = Math.random() > 0.5 ? usersIdsToPick[0] : usersIdsToPick[1];
  }

  return booking;
};

const prisma = new PrismaClient();
async function main() {
  // First find if not then create everything
  let insightsAdmin = await prisma.user.findFirst({
    where: {
      email: "insights@example.com",
    },
  });

  if (!insightsAdmin) {
    insightsAdmin = await prisma.user.create({
      data: {
        email: "insights@example.com",
        password: await hashPassword("insights"),
        name: "Insights Admin",
        role: "ADMIN",
        username: "insights",
        completedOnboarding: true,
      },
    });
  }

  let insightsUser = await prisma.user.findFirst({
    where: {
      email: "insightuser@example.com",
    },
  });

  if (!insightsUser) {
    insightsUser = await prisma.user.create({
      data: {
        email: "insightuser@example.com",
        password: await hashPassword("insightsuser"),
        name: "Insights User",
        role: "USER",
        username: "insights-user",
        completedOnboarding: true,
      },
    });
  }

  let insightsTeam = await prisma.team.findFirst({
    where: {
      slug: "insights-team",
    },
  });

  if (!insightsTeam) {
    insightsTeam = await prisma.team.create({
      data: {
        name: "Insights",
        slug: "insights-team",
      },
    });
    await prisma.membership.createMany({
      data: [
        {
          teamId: insightsTeam.id,
          userId: insightsAdmin.id,
          role: "OWNER",
          accepted: true,
        },
        {
          teamId: insightsTeam.id,
          userId: insightsUser.id,
          role: "MEMBER",
          accepted: true,
        },
      ],
    });
    if (!insightsTeam) {
      insightsTeam = await prisma.team.create({
        data: {
          name: "Insights",
          slug: "insights-team",
        },
      });
    }

    if (insightsAdmin && insightsTeam) {
      await prisma.team.update({
        where: {
          id: insightsTeam.id,
        },
        data: {
          members: {
            connect: {
              userId_teamId: {
                userId: insightsAdmin.id,
                teamId: insightsTeam.id,
              },
            },
          },
        },
      });
    }
  }

  const teamEvents = await prisma.eventType.findMany({
    where: {
      teamId: insightsTeam.id,
    },
  });

  const userSingleEventsAdmin = await prisma.eventType.findMany({
    where: {
      userId: insightsUser.id,
    },
  });

  const userSingleEvents = await prisma.eventType.findMany({
    where: {
      userId: insightsUser.id,
    },
  });

  if (userSingleEventsAdmin.length === 0 && userSingleEvents.length === 0) {
    await prisma.eventType.createMany({
      data: [
        {
          title: "Single Event Admin",
          slug: "single-event-admin",
          description: "Single Event Admin",
          length: 60,
          userId: insightsAdmin.id,
        },
        {
          title: "Single Event",
          slug: "single-event",
          description: "Single Event",
          length: 60,
          userId: insightsUser.id,
        },
      ],
    });
    const singleEventTypesAdmin = await prisma.eventType.findFirst({
      select: {
        id: true,
        length: true,
      },
      where: {
        userId: insightsAdmin.id,
      },
    });

    const singleEventTypes = await prisma.eventType.findFirst({
      select: {
        id: true,
        length: true,
      },
      where: {
        userId: insightsUser.id,
      },
    });

    if (!singleEventTypesAdmin || !singleEventTypes) {
      throw new Error("Could not create single event types");
    }

    const singleEvents = [singleEventTypesAdmin, singleEventTypes];

    // create bookings random for single event type
    const baseBookingSingle: Prisma.BookingCreateManyInput = {
      uid: "demoUIDSingle",
      title: "Single Event",
      description: "Single Event",
      startTime: dayjs().toISOString(),
      endTime: dayjs().toISOString(),
      // This gets overriden in shuffle
      userId: insightsUser.id,
    };

    // Validate if they are null of undefined throw error
    if (!insightsAdmin || !insightsUser || !insightsAdmin.id || !insightsUser.id) {
      throw new Error("Could not find user");
    }

    await prisma.booking.createMany({
      data: [
        ...new Array(100)
          .fill(0)
          .map(() =>
            shuffle({ ...baseBookingSingle }, dayjs().get("y") - 1, singleEvents, [
              insightsAdmin?.id ?? 0,
              insightsUser?.id ?? 0,
            ])
          ),
      ],
    });

    await prisma.booking.createMany({
      data: [
        ...new Array(100)
          .fill(0)
          .map(() =>
            shuffle({ ...baseBookingSingle }, dayjs().get("y") - 0, singleEvents, [
              insightsUser?.id ?? 0,
              insightsAdmin?.id ?? 0,
            ])
          ),
      ],
    });
  }

  if (teamEvents.length === 0) {
    await prisma.eventType.createMany({
      data: [
        {
          title: "Team Meeting",
          slug: "team-meeting",
          description: "Team Meeting",
          length: 60,
          teamId: insightsTeam.id,
          schedulingType: "ROUND_ROBIN",
        },
        {
          title: "Team Lunch",
          slug: "team-lunch",
          description: "Team Lunch",
          length: 30,
          teamId: insightsTeam.id,
          schedulingType: "COLLECTIVE",
        },
        {
          title: "Team Coffee",
          slug: "team-coffee",
          description: "Team Coffee",
          length: 15,
          teamId: insightsTeam.id,
          schedulingType: "COLLECTIVE",
        },
      ],
    });
  }

  const baseBooking: Prisma.BookingCreateManyInput = {
    uid: "demoUID",
    title: "Team Meeting",
    description: "Team Meeting",
    startTime: dayjs().toISOString(),
    endTime: dayjs().toISOString(),
    userId: insightsUser.id,
    eventTypeId: teamEvents[0].id,
  };

  // Create past bookings
  await prisma.booking.createMany({
    data: [
      ...new Array(100)
        .fill(0)
        .map(() =>
          shuffle({ ...baseBooking }, dayjs().get("y") - 2, teamEvents, [
            insightsAdmin?.id ?? 0,
            insightsUser?.id ?? 0,
          ])
        ),
    ],
  });

  await prisma.booking.createMany({
    data: [
      ...new Array(100).fill(0).map(() => shuffle({ ...baseBooking }, dayjs().get("y") - 1, teamEvents)),
    ],
  });

  await prisma.booking.createMany({
    data: [...new Array(100).fill(0).map(() => shuffle({ ...baseBooking }, dayjs().get("y"), teamEvents))],
  });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["insights@example", "insightsuser@example.com"],
        },
      },
    });

    await prisma.team.deleteMany({
      where: {
        slug: "insights",
      },
    });

    await prisma.$disconnect();
    process.exit(1);
  });
