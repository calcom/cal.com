import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";

const prisma = new PrismaClient();
async function main() {
  const insightsAdmin = await prisma.user.create({
    data: {
      email: "insights@example.com",
      password: "insights",
      name: "Insights Admin",
      role: "ADMIN",
    },
  });

  const insightsUser = await prisma.user.create({
    data: {
      email: "insightuser@example.com",
      password: "insightsuser",
      name: "Insights User",
      role: "USER",
    },
  });

  const insightsTeam = await prisma.team.create({
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

  await prisma.team.update({
    where: {
      id: insightsTeam.id,
    },
    data: {
      members: {
        connect: {
          userId_teamId: {
            userId: insightsUser.id,
            teamId: insightsTeam.id,
          },
        },
      },
    },
  });

  // Create team events types
  const teamEventTypes = await prisma.eventType.createMany({
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

  const teamEvents = await prisma.eventType.findMany({
    where: {
      teamId: insightsTeam.id,
    },
  });

  const baseBooking = {
    uid: "demoUID",
    title: "Team Meeting",
    description: "Team Meeting",
    startTime: dayjs().toISOString(),
    endTime: dayjs().toISOString(),
    userId: insightsUser.id,
    teamId: insightsTeam.id,
    eventType: {
      connect: {
        id: teamEvents[0].id,
      },
    },
  };

  const shuffle = (booking: typeof baseBooking, year) => {
    const startTime = dayjs(booking.startTime)
      .add(Math.floor(Math.random() * 365), "day")
      .add(Math.floor(Math.random() * 24), "hour")
      .add(Math.floor(Math.random() * 60), "minute")
      .set("y", year);
    const randomEvent = teamEvents[Math.floor(Math.random() * teamEvents.length)];
    const endTime = dayjs(startTime).add(Math.floor(Math.random() * randomEvent.length), "minute");

    booking.startTime = startTime.toISOString();
    booking.endTime = endTime.toISOString();

    booking.eventType.connect.id = teamEventTypes[Math.floor(Math.random() * teamEvents.length)].id;
    booking.uid = uuidv4();
    return booking;
  };

  // Create past bookings
  const pastBookings = await prisma.booking.createMany({
    data: [...new Array(20).fill(baseBooking).map(shuffle)],
  });

  console.log("pastBookings", pastBookings);
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
