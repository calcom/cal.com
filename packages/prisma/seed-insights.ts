import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { BookingStatus } from "@calcom/prisma/enums";

import { seedAttributes, seedRoutingFormResponses, seedRoutingForms } from "./seed-utils";

function getRandomRatingFeedback() {
  const feedbacks = [
    "Great chat!",
    "Okay-ish",
    "Quite Poor",
    "Excellent chat!",
    "Could be better",
    "Wonderful!",
  ];
  return feedbacks[Math.floor(Math.random() * feedbacks.length)];
}

const shuffle = (
  booking: any,
  year: number,
  eventTypesToPick: Prisma.EventTypeGetPayload<{
    select: {
      id: true;
      userId: true;
      title: true;
      length: true;
      description: true;
      teamId: true;
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

  booking.title = randomEvent.title;
  booking.description = randomEvent.description;
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
    // Pick a random user from all available users instead of just two
    booking.userId = usersIdsToPick[Math.floor(Math.random() * usersIdsToPick.length)];
  } else {
    booking.userId = randomEvent.userId;
  }

  if (booking.userId === undefined || booking.userId === null) {
    console.log({ randomEvent, usersIdsToPick });
    console.log("This should not happen");
  }

  booking.rating = Math.floor(Math.random() * 5) + 1; // Generates a random rating from 1 to 5
  booking.ratingFeedback = getRandomRatingFeedback(); // Random feedback from a predefined list
  booking.noShowHost = Math.random() < 0.5;

  return booking;
};

const prisma = new PrismaClient();
async function main() {
  // First find the organization we want to add insights to
  const organization = await prisma.team.findFirst({
    where: {
      slug: "acme",
      organizationSettings: {
        isOrganizationVerified: true,
        orgAutoAcceptEmail: "acme.com",
        isAdminAPIEnabled: true,
      },
    },
    include: {
      members: {
        include: {
          // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
          user: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization 'Acme Inc' not found. Please run seed.ts first.");
  }

  // Get all members of the organization
  const orgMembers = organization.members;

  let insightsTeam = await prisma.team.findFirst({
    where: {
      slug: "insights-team",
      parentId: organization.id, // Make sure team is under the organization
    },
  });

  if (!insightsTeam) {
    insightsTeam = await prisma.team.create({
      data: {
        name: "Insights",
        slug: "insights-team",
        parent: {
          connect: {
            id: organization.id,
          },
        },
      },
    });

    // Add org members to insights team
    await prisma.membership.createMany({
      data: orgMembers.map((member) => ({
        teamId: insightsTeam!.id,
        userId: member.user.id,
        role: member.role,
        accepted: true,
      })),
    });
  }

  // Create event types for the team
  let teamEvents = await prisma.eventType.findMany({
    where: {
      teamId: insightsTeam.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      teamId: true,
      userId: true,
    },
  });

  if (teamEvents?.length === 0) {
    await prisma.eventType.createMany({
      data: [
        {
          title: "Team Meeting",
          slug: "team-sales",
          description: "Team Meeting",
          length: 60,
          teamId: insightsTeam.id,
          schedulingType: "ROUND_ROBIN",
          assignAllTeamMembers: true,
        },
        {
          title: "Team Lunch",
          slug: "team-python",
          description: "Team Lunch",
          length: 30,
          teamId: insightsTeam.id,
          schedulingType: "ROUND_ROBIN",
          assignAllTeamMembers: true,
        },
        {
          title: "Team javascript",
          slug: "team-javascript",
          description: "Team Coffee",
          length: 15,
          teamId: insightsTeam.id,
          schedulingType: "ROUND_ROBIN",
          assignAllTeamMembers: true,
        },
      ],
    });
    teamEvents = await prisma.eventType.findMany({
      where: {
        teamId: insightsTeam.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        length: true,
        teamId: true,
        userId: true,
      },
    });
  }

  const insightsMembers = await prisma.membership.findMany({
    where: {
      teamId: insightsTeam.id,
    },
    include: {
      user: true,
    },
  });

  // Create bookings for the team events
  const baseBooking = {
    uid: "demoUID",
    title: "Team Meeting should be changed in shuffle",
    description: "Team Meeting Should be changed in shuffle",
    startTime: dayjs().toISOString(),
    endTime: dayjs().toISOString(),
    userId: insightsMembers[0].user.id, // Use first org member as default
  };

  // Create past bookings -2y, -1y, -0y
  await prisma.booking.createMany({
    data: [
      ...new Array(10000).fill(0).map(() =>
        shuffle(
          { ...baseBooking },
          dayjs().get("y") - 2,
          teamEvents,
          insightsMembers.map((m) => m.user.id)
        )
      ),
    ],
  });

  await prisma.booking.createMany({
    data: [
      ...new Array(10000).fill(0).map(() =>
        shuffle(
          { ...baseBooking },
          dayjs().get("y") - 1,
          teamEvents,
          insightsMembers.map((m) => m.user.id)
        )
      ),
    ],
  });

  await prisma.booking.createMany({
    data: [
      ...new Array(10000).fill(0).map(() =>
        shuffle(
          { ...baseBooking },
          dayjs().get("y"),
          teamEvents,
          insightsMembers.map((m) => m.user.id)
        )
      ),
    ],
  });

  // Find owner of the organization
  const owner = orgMembers.find((m) => m.role === "OWNER" || m.role === "ADMIN");

  // Then seed routing forms
  const attributes = await seedAttributes(organization.id);
  if (!attributes) {
    throw new Error("Attributes not found");
  }
  const seededForm = await seedRoutingForms(
    insightsTeam.id,
    owner?.user.id ?? insightsMembers[0].user.id,
    attributes
  );

  if (seededForm) {
    await seedRoutingFormResponses(seededForm, attributes, insightsTeam.id);
  }
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

/**
 * This will create many users in insights teams with bookings 1y in the past
 * Should be run after the main function is executed once
 */
async function createPerformanceData() {
  const createExtraMembers = false; // Turn ON to be executed
  let extraMembersIds;
  const insightsTeam = await prisma.team.findFirst({
    where: {
      slug: "insights-team",
    },
  });

  if (createExtraMembers) {
    const insightsRandomUsers: Prisma.UserCreateManyArgs["data"] = [];
    const numInsightsUsers = 50; // Change this value to adjust the number of insights users to create
    for (let i = 0; i < numInsightsUsers; i++) {
      const timestamp = Date.now();
      const email = `insightsuser${timestamp}@example.com`;
      const insightsUser = {
        email,
        password: {
          create: {
            hash: await hashPassword("insightsuser"),
          },
        },
        name: `Insights User ${timestamp}`,
        username: `insights-user-${timestamp}`,
        completedOnboarding: true,
      };
      insightsRandomUsers.push(insightsUser);
    }

    await prisma.user.createMany({
      data: insightsRandomUsers,
    });
    // Lets find the ids of the users we just created
    extraMembersIds = await prisma.user.findMany({
      where: {
        email: {
          in: insightsRandomUsers.map((user) => user.email),
        },
      },
      select: {
        id: true,
      },
    });
  }

  if (createExtraMembers) {
    if (insightsTeam === null) {
      console.log("This should not happen");
      throw new Error("Insights team id is undefined or null");
    }

    await prisma.membership.createMany({
      data: extraMembersIds.map((memberId) => ({
        teamId: insightsTeam?.id ?? 1,
        userId: memberId.id,
        role: "MEMBER",
        accepted: true,
      })),
    });

    const updateMemberPromises = extraMembersIds.map((memberId) =>
      prisma.team.update({
        where: {
          id: insightsTeam?.id,
        },
        data: {
          members: {
            connect: {
              userId_teamId: {
                userId: memberId.id,
                teamId: insightsTeam?.id ?? 1,
              },
            },
          },
        },
      })
    );

    await Promise.all(updateMemberPromises);

    // Create events for every Member id
    const createEvents = extraMembersIds.map((memberId) => ({
      title: `Single Event User - ${memberId.id}`,
      slug: `single-event-user-${memberId.id}`,
      description: `Single Event User - ${memberId.id}`,
      length: 30,
      userId: memberId.id,
      users: {
        connect: {
          id: memberId.id,
        },
      },
    }));
    const createEventPromises = createEvents.map((data) =>
      prisma.eventType.create({
        data,
      })
    );
    await Promise.all(createEventPromises);

    // load the events we just created
    const singleEventsCreated = await prisma.eventType.findMany({
      where: {
        userId: {
          in: extraMembersIds.map((memberId) => memberId.id),
        },
      },
    });

    // Create bookings for every single event
    const baseBooking = {
      uid: "demo performance data  booking",
      title: "Single Event Booking Perf",
      description: "Single Event Booking Perf",
      startTime: dayjs().toISOString(),
      endTime: dayjs().toISOString(),
      eventTypeId: singleEventsCreated[0].id,
    };

    await prisma.booking.createMany({
      data: [
        ...new Array(10000)
          .fill(0)
          .map(() => shuffle({ ...baseBooking }, dayjs().get("y"), singleEventsCreated)),
      ],
    });
  }
}

createPerformanceData()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.user.deleteMany({
      where: {
        username: {
          contains: "insights-user-",
        },
      },
    });
    await prisma.$disconnect();
    process.exit(1);
  });
