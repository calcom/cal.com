import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { RefundPolicy } from "@calcom/lib/payment/types";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus, AssignmentReasonEnum, PaymentOption } from "@calcom/prisma/enums";

import { seedAttributes, seedRoutingFormResponses, seedRoutingForms } from "./seed-utils";

// Valid statuses for seed data
// AWAITING_HOST is excluded because it requires special handling:
// - userId must be NULL (not assigned until host joins)
// - Requires InstantMeetingToken to be created
// - Only used for actual instant meetings via InstantBookingCreateService
const VALID_STATUSES_FOR_SEED = Object.values(BookingStatus).filter(
  (status) => status !== BookingStatus.AWAITING_HOST
);

function getRandomBookingStatus() {
  const randomStatusIndex = Math.floor(Math.random() * VALID_STATUSES_FOR_SEED.length);
  return VALID_STATUSES_FOR_SEED[randomStatusIndex];
}

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

type BookingInput = {
  uid: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  userId: number;
  [key: string]: unknown;
};

const shuffle = (
  booking: BookingInput,
  year: number,
  eventTypesToPick: Prisma.EventTypeGetPayload<{
    select: {
      id: true;
      userId: true;
      title: true;
      length: true;
      description: true;
      teamId: true;
      recurringEvent: true;
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
  booking.description = randomEvent.description || "";
  booking.startTime = startTime.toISOString();
  booking.endTime = endTime.toISOString();
  booking.createdAt = startTime.subtract(1, "day").toISOString();

  booking.status = getRandomBookingStatus();

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
  } else if (randomEvent.userId) {
    booking.userId = randomEvent.userId;
  } else {
    console.log({ randomEvent, usersIdsToPick });
    throw new Error("No valid userId available for booking");
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

type BookingWithId = {
  id: number;
};

async function createAttendees(bookings: BookingWithId[]) {
  // Batch create all attendees at once
  const allAttendees = bookings.flatMap((booking) =>
    Array(Math.floor(Math.random() * 4))
      .fill(null)
      .map(() => ({
        bookingId: booking.id,
        timeZone: faker.location.timeZone(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
      }))
  );

  if (allAttendees.length > 0) {
    await prisma.attendee.createMany({
      data: allAttendees,
    });
  }
}

type BookingWithEventType = {
  id: number;
  paid: boolean;
  eventType?: {
    price?: number;
    currency?: string;
  };
};

async function _createPayments(bookings: BookingWithEventType[]) {
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

type PaymentScenario = {
  status: BookingStatus;
  paid: boolean;
  success: boolean;
  refunded: boolean;
  paymentOption?: PaymentOption;
  startTime: dayjs.Dayjs;
  cancellationReason?: string;
  scenarioName: string;
};

type BookingWithPaymentData = {
  id: number;
  eventType?: {
    price?: number;
    currency?: string;
  };
  paymentSuccess: boolean;
  paymentRefunded: boolean;
  paymentOption: PaymentOption;
};

async function createPaymentsForScenarios(bookings: BookingWithPaymentData[]) {
  console.log(`Creating payments for ${bookings.length} bookings with diverse scenarios...`);

  // Batch create all payments at once
  const paymentData = bookings.map((booking) => {
    const amount = booking.eventType?.price || 5000;
    const currency = booking.eventType?.currency || "usd";
    const paymentOption = booking.paymentOption || PaymentOption.ON_BOOKING;

    return {
      uid: uuidv4(),
      appId: "stripe",
      bookingId: booking.id,
      amount,
      fee: Math.floor(amount * 0.029) + 30,
      currency,
      success: booking.paymentSuccess,
      refunded: booking.paymentRefunded,
      paymentOption,
      data: {},
      externalId: `ch_${uuidv4().substring(0, 24)}`,
    };
  });

  await prisma.payment.createMany({
    data: paymentData,
  });

  console.log(`Successfully created payments for ${bookings.length} bookings`);
}

async function createDiversePaymentBookings(organizationId: number) {
  console.log("\n=== Creating diverse payment event types and bookings ===");

  // Find the insights team
  const insightsTeam = await prisma.team.findFirst({
    where: {
      slug: "insights-team",
      parentId: organizationId,
    },
  });

  if (!insightsTeam) {
    console.log("Insights team not found, skipping payment event type creation");
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
    console.log("No team members found, skipping payment event type creation");
    return;
  }

  // Create multiple event types with different pricing and refund policies
  const eventTypeConfigs = [
    {
      slug: "standard-consultation",
      title: "Standard Consultation",
      price: 5000,
      refundPolicy: RefundPolicy.ALWAYS,
      description: "1-hour consultation with full refund policy",
    },
    {
      slug: "premium-consultation",
      title: "Premium Consultation",
      price: 10000,
      refundPolicy: RefundPolicy.DAYS,
      refundDaysCount: 7,
      description: "Premium 1-hour consultation with 7-day refund window",
    },
    {
      slug: "non-refundable-session",
      title: "Non-Refundable Session",
      price: 7500,
      refundPolicy: RefundPolicy.NEVER,
      description: "1-hour session - non-refundable",
    },
    {
      slug: "consultation-with-hold",
      title: "Consultation with Payment Hold",
      price: 5000,
      refundPolicy: RefundPolicy.ALWAYS,
      paymentOption: PaymentOption.HOLD,
      description: "1-hour consultation with payment hold option",
    },
  ];

  type EventTypeWithRequiredFields = Prisma.EventTypeGetPayload<{
    select: {
      id: true;
      title: true;
      slug: true;
      description: true;
      length: true;
      price: true;
      currency: true;
      metadata: true;
    };
  }>;

  const createdEventTypes: EventTypeWithRequiredFields[] = [];

  for (const config of eventTypeConfigs) {
    let eventType = await prisma.eventType.findFirst({
      where: {
        slug: config.slug,
        teamId: insightsTeam.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        length: true,
        price: true,
        currency: true,
        metadata: true,
      },
    });

    if (!eventType) {
      type StripeMetadata = {
        price: number;
        currency: string;
        enabled: boolean;
        refundPolicy: RefundPolicy;
        refundDaysCount?: number;
        paymentOption?: PaymentOption;
      };

      const stripeConfig: StripeMetadata = {
        price: config.price,
        currency: "usd",
        enabled: true,
        refundPolicy: config.refundPolicy,
      };

      if (config.refundDaysCount) {
        stripeConfig.refundDaysCount = config.refundDaysCount;
      }

      if (config.paymentOption) {
        stripeConfig.paymentOption = config.paymentOption;
      }

      const metadata: Prisma.InputJsonValue = {
        apps: {
          stripe: stripeConfig,
        },
      };

      const createdEventType = await prisma.eventType.create({
        data: {
          title: config.title,
          slug: config.slug,
          description: config.description,
          length: 60,
          teamId: insightsTeam.id,
          schedulingType: "ROUND_ROBIN",
          assignAllTeamMembers: true,
          price: config.price,
          currency: "usd",
          metadata,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          length: true,
          price: true,
          currency: true,
          metadata: true,
        },
      });

      // Create Host records for all team members
      await prisma.host.createMany({
        data: insightsTeamMembers.map((member) => ({
          userId: member.user.id,
          eventTypeId: createdEventType.id,
          isFixed: false,
        })),
        skipDuplicates: true,
      });

      console.log(`Created event type: ${createdEventType.title}`);
      eventType = createdEventType;
    }

    createdEventTypes.push(eventType);
  }

  // Define payment scenarios with specific distributions
  const scenarios: {
    eventTypeIndex: number;
    count: number;
    scenario: Partial<PaymentScenario>;
  }[] = [
    // Scenario 1: Successful paid bookings (20%)
    {
      eventTypeIndex: 0,
      count: 20,
      scenario: {
        status: BookingStatus.ACCEPTED,
        paid: true,
        success: true,
        refunded: false,
        startTime: dayjs().add(7, "days"),
        scenarioName: "Successful Paid",
      },
    },
    // Scenario 2: Awaiting payment (15%)
    {
      eventTypeIndex: 0,
      count: 15,
      scenario: {
        status: BookingStatus.ACCEPTED,
        paid: true,
        success: false,
        refunded: false,
        startTime: dayjs().add(5, "days"),
        scenarioName: "Awaiting Payment",
      },
    },
    // Scenario 3: Awaiting payment with HOLD option (10%)
    {
      eventTypeIndex: 3,
      count: 10,
      scenario: {
        status: BookingStatus.PENDING,
        paid: true,
        success: false,
        refunded: false,
        paymentOption: PaymentOption.HOLD,
        startTime: dayjs().add(3, "days"),
        scenarioName: "Awaiting Payment (HOLD)",
      },
    },
    // Scenario 4: Cancelled with refund completed (10%)
    {
      eventTypeIndex: 0,
      count: 10,
      scenario: {
        status: BookingStatus.CANCELLED,
        paid: true,
        success: true,
        refunded: true,
        startTime: dayjs().subtract(2, "days"),
        cancellationReason: "Customer requested refund",
        scenarioName: "Cancelled - Refunded",
      },
    },
    // Scenario 5: Cancelled with ALWAYS policy (10%)
    {
      eventTypeIndex: 0,
      count: 10,
      scenario: {
        status: BookingStatus.CANCELLED,
        paid: true,
        success: true,
        refunded: false,
        startTime: dayjs().subtract(1, "days"),
        cancellationReason: "Change of plans",
        scenarioName: "Cancelled - ALWAYS policy (no refund yet)",
      },
    },
    // Scenario 6: Cancelled with NEVER policy (10%)
    {
      eventTypeIndex: 2,
      count: 10,
      scenario: {
        status: BookingStatus.CANCELLED,
        paid: true,
        success: true,
        refunded: false,
        startTime: dayjs().subtract(3, "days"),
        cancellationReason: "Emergency cancellation",
        scenarioName: "Cancelled - NEVER policy",
      },
    },
    // Scenario 7: Cancelled DAYS policy - within window (10%)
    {
      eventTypeIndex: 1,
      count: 10,
      scenario: {
        status: BookingStatus.CANCELLED,
        paid: true,
        success: true,
        refunded: false,
        startTime: dayjs().add(5, "days"),
        cancellationReason: "Need to reschedule",
        scenarioName: "Cancelled - DAYS policy (within window)",
      },
    },
    // Scenario 8: Cancelled DAYS policy - expired (10%)
    {
      eventTypeIndex: 1,
      count: 10,
      scenario: {
        status: BookingStatus.CANCELLED,
        paid: true,
        success: true,
        refunded: false,
        startTime: dayjs().subtract(10, "days"),
        cancellationReason: "Late cancellation",
        scenarioName: "Cancelled - DAYS policy (expired window)",
      },
    },
    // Scenario 9: Cancelled without success (5%)
    {
      eventTypeIndex: 0,
      count: 5,
      scenario: {
        status: BookingStatus.CANCELLED,
        paid: true,
        success: false,
        refunded: false,
        startTime: dayjs().add(2, "days"),
        cancellationReason: "Payment failed, cancelled",
        scenarioName: "Cancelled - No payment success",
      },
    },
  ];

  // Create bookings for each scenario
  type ScenarioBooking = {
    uid: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    status: BookingStatus;
    eventTypeId: number;
    userId: number;
    paid: boolean;
    rescheduled: boolean;
    cancellationReason: string | null;
    paymentSuccess: boolean;
    paymentRefunded: boolean;
    paymentOption: PaymentOption;
    scenarioName: string;
  };

  const allScenarioBookings: ScenarioBooking[] = [];

  for (const { eventTypeIndex, count, scenario } of scenarios) {
    const eventType = createdEventTypes[eventTypeIndex];

    for (let i = 0; i < count; i++) {
      const startTime = scenario.startTime!;
      const endTime = dayjs(startTime).add(60, "minutes");

      allScenarioBookings.push({
        uid: uuidv4(),
        title: eventType.title,
        description: eventType.description || "",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        createdAt: startTime.subtract(1, "day").toISOString(),
        status: scenario.status!,
        eventTypeId: eventType.id,
        userId: insightsTeamMembers[Math.floor(Math.random() * insightsTeamMembers.length)].user.id,
        paid: scenario.paid!,
        rescheduled: false,
        cancellationReason: scenario.cancellationReason || null,
        // Store payment details temporarily for payment creation
        paymentSuccess: scenario.success!,
        paymentRefunded: scenario.refunded!,
        paymentOption: scenario.paymentOption || PaymentOption.ON_BOOKING,
        scenarioName: scenario.scenarioName!,
      });
    }

    console.log(`Prepared ${count} bookings for scenario: ${scenario.scenarioName}`);
  }

  console.log(`Creating ${allScenarioBookings.length} bookings across all scenarios...`);

  // Insert all bookings
  await prisma.booking.createMany({
    data: allScenarioBookings.map((booking) => {
      // Remove temporary payment fields before inserting
      const {
        paymentSuccess: _ps,
        paymentRefunded: _pr,
        paymentOption: _po,
        scenarioName: _sn,
        ...bookingData
      } = booking;
      return bookingData;
    }),
  });

  // Get created bookings with event types
  // Use a more specific query to get only the bookings we just created
  const eventTypeIds = createdEventTypes.map((et) => et.id);
  const createdBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: { in: eventTypeIds },
      paid: true, // Only get paid bookings since we created them with paid: true
    },
    include: {
      eventType: {
        select: {
          price: true,
          currency: true,
          metadata: true,
        },
      },
    },
    orderBy: {
      id: "desc", // Order by ID is faster than createdAt
    },
    take: allScenarioBookings.length,
  });

  // Match created bookings with scenario data to restore payment fields
  const bookingsForPayments: BookingWithPaymentData[] = createdBookings
    .slice(0, allScenarioBookings.length)
    .map((booking, index) => {
      const scenarioBooking = allScenarioBookings[allScenarioBookings.length - 1 - index]; // Reverse order since we sorted desc
      return {
        id: booking.id,
        eventType: booking.eventType || undefined,
        paymentSuccess: scenarioBooking.paymentSuccess,
        paymentRefunded: scenarioBooking.paymentRefunded,
        paymentOption: scenarioBooking.paymentOption,
      };
    });

  // Create attendees for all bookings
  await createAttendees(createdBookings);

  // Create payments with appropriate states for each scenario
  await createPaymentsForScenarios(bookingsForPayments);

  console.log(`Successfully created ${allScenarioBookings.length} bookings with diverse payment scenarios`);
  console.log("\nScenario distribution:");
  scenarios.forEach(({ count, scenario }) => {
    console.log(`  - ${scenario.scenarioName}: ${count} bookings`);
  });
  console.log("=== Diverse payment bookings creation completed ===\n");
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

  let insightsTeamMembers = await prisma.membership.findMany({
    where: {
      teamId: insightsTeam.id,
    },
    include: {
      user: true,
    },
  });

  // If the team exists but has no members, add org members to it
  if (insightsTeamMembers.length === 0) {
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

    // Refetch the members
    insightsTeamMembers = await prisma.membership.findMany({
      where: {
        teamId: insightsTeam.id,
      },
      include: {
        user: true,
      },
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
    const assignAllTeamMembersEvents = teamEvents.filter((event) => event.assignAllTeamMembers);
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
  // NOTE: Reduced from 10000 to 1000 to avoid transaction timeout
  // Increase these numbers back to 10000 if you need more data for performance testing
  await prisma.booking.createMany({
    data: [
      ...new Array(1000).fill(0).map(() =>
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
      ...new Array(1000).fill(0).map(() =>
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
      ...new Array(1000).fill(0).map(() =>
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
  if (!javascriptEventId || !salesEventId) {
    throw new Error("Required event types not found");
  }
  const seededForm = await seedRoutingForms(
    insightsTeam.id,
    owner?.user.id ?? insightsTeamMembers[0].user.id,
    attributes,
    javascriptEventId,
    salesEventId
  );

  if (seededForm) {
    await seedRoutingFormResponses(seededForm, attributes, insightsTeam.id);
  }

  await seedBookingAssignments();

  // Create diverse payment scenarios for testing
  await createDiversePaymentBookings(organization.id);
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
    const insightsRandomUsers: { email: string; name: string; username: string }[] = [];
    const numInsightsUsers = 50; // Change this value to adjust the number of insights users to create
    const passwordHash = await hashPassword("insightsuser");

    for (let i = 0; i < numInsightsUsers; i++) {
      const timestamp = Date.now();
      const email = `insightsuser${timestamp}@example.com`;
      const insightsUser = {
        email,
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

    // Create passwords for all users
    await prisma.userPassword.createMany({
      data: extraMembersIds.map((user) => ({
        userId: user.id,
        hash: passwordHash,
      })),
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
      userId: extraMembersIds[0].id,
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
