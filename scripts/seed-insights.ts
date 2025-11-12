import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus, AssignmentReasonEnum } from "@calcom/prisma/enums";

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

  // Add random video call links to 40% of bookings
  const random = Math.random();
  if (random < 0.2) {
    // 20% Google Meet
    const randomMeetId = Math.random().toString(36).substring(2, 15);
    booking.metadata = {
      videoCallUrl: `https://meet.google.com/${randomMeetId}`,
    };
    booking.location = "integrations:google:meet";
  } else if (random < 0.35) {
    // 15% Zoom
    const randomZoomId = Math.floor(Math.random() * 1000000000);
    booking.metadata = {
      videoCallUrl: `https://zoom.us/j/${randomZoomId}`,
    };
    booking.location = "integrations:zoom";
  } else if (random < 0.4) {
    // 5% Cal Video
    booking.metadata = {
      videoCallUrl: `https://cal.com/video/${uuidv4()}`,
    };
    booking.location = "integrations:daily";
  }

  // Add recurring event ID to 10% of bookings from recurring events
  if (randomEvent.recurringEvent && Math.random() < 0.1) {
    booking.recurringEventId = uuidv4();
  }

  return booking;
};

async function createAttendees(bookings: any[]) {
  for (const booking of bookings) {
    await prisma.attendee.createMany({
      data: Array(Math.floor(Math.random() * 4))
        .fill(null)
        .map(() => {
          return {
            bookingId: booking.id,
            timeZone: faker.location.timeZone(),
            email: faker.internet.email(),
            name: faker.person.fullName(),
          };
        }),
    });
  }
}

async function createPayments(bookings: any[]) {
  // Filter for paid bookings
  const paidBookings = bookings.filter((booking) => booking.paid);

  if (paidBookings.length === 0) {
    console.log("No paid bookings found, skipping payment creation");
    return;
  }

  console.log(`Creating payments for ${paidBookings.length} paid bookings...`);

  for (const booking of paidBookings) {
    // Use event type's price and currency, with fallback to defaults
    const amount = booking.eventType?.price || 5000; // Default to $50.00 if not set
    const currency = booking.eventType?.currency || "usd";
    const externalIdPrefix = "ch_"; // Stripe charge ID

    await prisma.payment.create({
      data: {
        uid: uuidv4(),
        appId: "stripe",
        bookingId: booking.id,
        amount,
        fee: Math.floor(amount * 0.029) + 30, // Typical Stripe fee: 2.9% + $0.30
        currency,
        success: true,
        refunded: false,
        data: {},
        externalId: `${externalIdPrefix}${uuidv4().substring(0, 24)}`,
      },
    });
  }

  console.log(`Successfully created payments for ${paidBookings.length} bookings`);
}

async function createPaidEventTypeAndBookings(organizationId: number) {
  console.log("Creating paid event type and bookings...");

  // Find the insights team
  const insightsTeam = await prisma.team.findFirst({
    where: {
      slug: "insights-team",
      parentId: organizationId,
    },
  });

  if (!insightsTeam) {
    console.log("Insights team not found, skipping paid event type creation");
    return;
  }

  // Get team members
  const insightsTeamMembers = await prisma.membership.findMany({
    where: {
      teamId: insightsTeam.id,
    },
    include: {
      user: true,
    },
  });

  if (insightsTeamMembers.length === 0) {
    console.log("No team members found, skipping paid event type creation");
    return;
  }

  // Check if paid event type already exists
  let paidEventType = await prisma.eventType.findFirst({
    where: {
      slug: "paid-consultation",
      teamId: insightsTeam.id,
    },
  });

  // Create paid event type if it doesn't exist
  if (!paidEventType) {
    paidEventType = await prisma.eventType.create({
      data: {
        title: "Paid Consultation",
        slug: "paid-consultation",
        description: "1-hour paid consultation session",
        length: 60,
        teamId: insightsTeam.id,
        schedulingType: "ROUND_ROBIN",
        assignAllTeamMembers: true,
        price: 5000, // $50.00
        currency: "usd",
        metadata: {
          apps: {
            stripe: {
              price: 5000,
              currency: "usd",
              enabled: true,
            },
          },
        },
      },
    });

    // Create Host records for all team members
    await prisma.host.createMany({
      data: insightsTeamMembers.map((member) => ({
        userId: member.user.id,
        eventTypeId: paidEventType!.id,
        isFixed: false,
      })),
      skipDuplicates: true,
    });

    console.log(`Created paid event type: ${paidEventType.title}`);
  }

  // Create 100 paid bookings
  const baseBooking = {
    uid: "demoUID",
    title: "Paid Consultation",
    description: "1-hour paid consultation session",
    startTime: dayjs().toISOString(),
    endTime: dayjs().toISOString(),
    userId: insightsTeamMembers[0].user.id,
  };

  console.log(`Creating 100 paid bookings for event type: ${paidEventType.title}`);
  await prisma.booking.createMany({
    data: [
      ...new Array(100).fill(0).map(() => {
        const booking = shuffle(
          { ...baseBooking },
          dayjs().get("y"),
          [paidEventType!],
          insightsTeamMembers.map((m) => m.user.id)
        );
        // Override status for paid bookings - they should always be accepted
        booking.status = "ACCEPTED";
        booking.paid = true;
        booking.rescheduled = false;
        return booking;
      }),
    ],
  });

  // Get the paid bookings we just created
  const paidBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: paidEventType.id,
      paid: true,
    },
    include: {
      eventType: {
        select: {
          price: true,
          currency: true,
        },
      },
    },
  });

  // Create attendees for paid bookings
  await createAttendees(paidBookings);

  // Create payments for paid bookings
  await createPayments(paidBookings);

  console.log(`Successfully created ${paidBookings.length} paid bookings with payments`);
}

async function seedBookingAssignments() {
  const assignmentReasons = [
    AssignmentReasonEnum.ROUTING_FORM_ROUTING,
    AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK,
    AssignmentReasonEnum.REASSIGNED,
    AssignmentReasonEnum.REROUTED,
    AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
  ];
  // Get all booking IDs
  const bookings = await prisma.booking.findMany({
    select: {
      id: true,
    },
  });

  // Take 20% of bookings randomly
  const numberOfBookingsToAssign = Math.floor(bookings.length * 0.2);
  const randomBookings = bookings.sort(() => Math.random() - 0.5).slice(0, numberOfBookingsToAssign);

  // Create assignment reasons for the random bookings
  await prisma.assignmentReason.createMany({
    data: randomBookings.map((booking) => ({
      bookingId: booking.id,
      reasonString: faker.lorem.sentence(),
      reasonEnum: assignmentReasons[Math.floor(Math.random() * assignmentReasons.length)],
    })),
  });
}

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

  let insightsTeam = await prisma.team.findUnique({
    where: {
      slug_parentId: {
        slug: "insights-team",
        parentId: organization.id, // Make sure team is under the organization
      },
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
  }

  const insightsTeamMembers = await prisma.membership.findMany({
    where: {
      teamId: insightsTeam.id,
    },
    include: {
      user: true,
    },
  });

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
      assignAllTeamMembers: true,
      recurringEvent: true,
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
        {
          title: "Weekly Standup",
          slug: "weekly-standup",
          description: "Weekly team standup meeting",
          length: 30,
          teamId: insightsTeam.id,
          schedulingType: "ROUND_ROBIN",
          assignAllTeamMembers: true,
          recurringEvent: {
            freq: 2, // Weekly (RRULE freq: WEEKLY = 2)
            count: 10,
            interval: 1,
          },
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
        assignAllTeamMembers: true,
        recurringEvent: true,
      },
    });

    // After creating or fetching teamEvents and insightsTeamMembers
    // Create Host records for all team members for each event with assignAllTeamMembers true
    const assignAllTeamMembersEvents = teamEvents.filter((event) => (event as any).assignAllTeamMembers);
    if (assignAllTeamMembersEvents.length > 0 && insightsTeamMembers.length > 0) {
      const hostRecords = assignAllTeamMembersEvents.flatMap((event) =>
        insightsTeamMembers.map((member) => ({
          userId: member.user.id,
          eventTypeId: event.id,
          isFixed: false,
        }))
      );
      if (hostRecords.length > 0) {
        await prisma.host.createMany({
          data: hostRecords,
          skipDuplicates: true,
        });
      }
    }
  }

  const javascriptEventId = teamEvents.find((event) => event.slug === "team-javascript")?.id;
  const salesEventId = teamEvents.find((event) => event.slug === "team-sales")?.id;

  // Create bookings for the team events
  const baseBooking = {
    uid: "demoUID",
    title: "Team Meeting should be changed in shuffle",
    description: "Team Meeting Should be changed in shuffle",
    startTime: dayjs().toISOString(),
    endTime: dayjs().toISOString(),
    userId: insightsTeamMembers[0].user.id, // Use first org member as default
  };

  // Create past bookings -2y, -1y, -0y
  await prisma.booking.createMany({
    data: [
      ...new Array(10000).fill(0).map(() =>
        shuffle(
          { ...baseBooking },
          dayjs().get("y") - 2,
          teamEvents,
          insightsTeamMembers.map((m) => m.user.id)
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
          insightsTeamMembers.map((m) => m.user.id)
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
          insightsTeamMembers.map((m) => m.user.id)
        )
      ),
    ],
  });

  const allBookings = await prisma.booking.findMany();
  await createAttendees(allBookings);

  // Find owner of the organization
  const owner = orgMembers.find((m) => m.role === "OWNER" || m.role === "ADMIN");

  // Then seed routing forms
  const attributes = await seedAttributes(organization.id);
  if (!attributes) {
    throw new Error("Attributes not found");
  }
  const seededForm = await seedRoutingForms(
    insightsTeam.id,
    owner?.user.id ?? insightsTeamMembers[0].user.id,
    attributes
  );

  if (seededForm) {
    await seedRoutingFormResponses(seededForm, attributes, insightsTeam.id);
  }

  await seedBookingAssignments();

  // Create paid event type and bookings separately
  await createPaidEventTypeAndBookings(organization.id);
}

async function runMain() {
  await main().catch(async (e) => {
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
}

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
        createdAt: new Date(),
        updatedAt: new Date(),
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

async function runPerformanceData() {
  await createPerformanceData().catch(async (e) => {
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
}

async function runEverything() {
  await prisma.$connect();

  await runMain();
  await runPerformanceData();
}

runEverything()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
