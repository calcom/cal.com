import { faker } from "@faker-js/faker";
import { MembershipRole, Prisma, SchedulingType } from "@prisma/client";
import { uuid } from "short-uuid";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";

import prisma from ".";

const TEAM_SIZE = 1000;
const BATCH_SIZE = 50;

async function createLargeTeam() {
  console.log(`🚀 Starting creation of performance test team with ${TEAM_SIZE} members...`);

  const startTime = Date.now();

  // Step 1: Create the team
  const teamSlug = `perf-test-${Date.now()}`;
  const team = await prisma.team.create({
    data: {
      name: `Performance Test Team (${TEAM_SIZE} members)`,
      slug: teamSlug,
      metadata: {
        description: `Team created for performance testing with ${TEAM_SIZE} members`,
      },
    },
  });

  console.log(`✅ Team created: ${team.name} (ID: ${team.id})`);
  console.log(`📍 Team URL: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/team/${teamSlug}`);

  // Step 2: Create team event types
  const eventTypes = await Promise.all([
    prisma.eventType.create({
      data: {
        title: "15min Quick Call",
        slug: `${teamSlug}-15min`,
        length: 15,
        team: { connect: { id: team.id } },
        schedulingType: SchedulingType.COLLECTIVE,
        description: "A quick 15-minute team call",
      },
    }),
    prisma.eventType.create({
      data: {
        title: "30min Team Meeting",
        slug: `${teamSlug}-30min`,
        length: 30,
        team: { connect: { id: team.id } },
        schedulingType: SchedulingType.ROUND_ROBIN,
        description: "30-minute round-robin team meeting",
      },
    }),
    prisma.eventType.create({
      data: {
        title: "60min Strategy Session",
        slug: `${teamSlug}-60min`,
        length: 60,
        team: { connect: { id: team.id } },
        schedulingType: SchedulingType.COLLECTIVE,
        description: "60-minute collective strategy session",
      },
    }),
  ]);

  console.log(`✅ Created ${eventTypes.length} team event types`);

  // Step 3: Create users in batches
  console.log(`\n👥 Creating ${TEAM_SIZE} users in batches of ${BATCH_SIZE}...`);

  const allUsers: Prisma.UserCreateInput[] = [];
  let processedUsers = 0;

  for (let batch = 0; batch < Math.ceil(TEAM_SIZE / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min((batch + 1) * BATCH_SIZE, TEAM_SIZE);
    const batchSize = batchEnd - batchStart;

    console.log(
      `\n📦 Processing batch ${batch + 1}/${Math.ceil(TEAM_SIZE / BATCH_SIZE)} (users ${
        batchStart + 1
      }-${batchEnd})...`
    );

    // Create user data for this batch
    const batchUserData: Prisma.UserCreateInput[] = [];
    for (let i = batchStart; i < batchEnd; i++) {
      const username = `perf-user-${teamSlug}-${i + 1}`;
      const email = `${username}@example.com`;
      const hashedPassword = await hashPassword(username);

      batchUserData.push({
        email,
        username,
        name: faker.person.fullName(),
        emailVerified: new Date(),
        completedOnboarding: true,
        locale: "en",
        timeZone: faker.helpers.arrayElement([
          "America/New_York",
          "America/Chicago",
          "America/Los_Angeles",
          "Europe/London",
          "Europe/Paris",
          "Asia/Tokyo",
          "Australia/Sydney",
        ]),
      });
    }

    // Bulk create users
    await prisma.user.createMany({
      data: batchUserData,
    });

    // Fetch created users
    const createdUsers = await prisma.user.findMany({
      where: {
        email: {
          in: batchUserData.map((u) => u.email),
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });

    // Create passwords for users
    await Promise.all(
      createdUsers.map(async (user) => {
        await prisma.userPassword.create({
          data: {
            userId: user.id,
            hash: await hashPassword(user.username ?? ""),
          },
        });
      })
    );

    // Create schedules for users
    await Promise.all(
      createdUsers.map(async (user) => {
        await prisma.schedule.create({
          data: {
            name: "Working Hours",
            userId: user.id,
            availability: {
              createMany: {
                data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
              },
            },
          },
        });
      })
    );

    // Create memberships
    const membershipData = createdUsers.map((user, index) => ({
      teamId: team.id,
      userId: user.id,
      role:
        index === 0 && batch === 0
          ? MembershipRole.OWNER
          : index < 5 && batch === 0
          ? MembershipRole.ADMIN
          : MembershipRole.MEMBER,
      accepted: true,
      createdAt: new Date(),
    }));

    await prisma.membership.createMany({
      data: membershipData,
    });

    // Connect users to team event types
    for (const eventType of eventTypes) {
      await prisma.eventType.update({
        where: { id: eventType.id },
        data: {
          users: {
            connect: createdUsers.map((user) => ({ id: user.id })),
          },
        },
      });
    }

    allUsers.push(...createdUsers);
    processedUsers += batchSize;

    console.log(`✅ Batch ${batch + 1} completed: ${batchSize} users created and added to team`);
    console.log(
      `📊 Progress: ${processedUsers}/${TEAM_SIZE} users (${Math.round((processedUsers / TEAM_SIZE) * 100)}%)`
    );
  }

  // Step 4: Create some sample bookings for the team events
  console.log(`\n📅 Creating sample bookings for team events...`);

  const bookingData: Prisma.BookingCreateManyInput[] = [];
  const numBookings = Math.min(100, TEAM_SIZE / 10); // Create up to 100 bookings

  for (let i = 0; i < numBookings; i++) {
    const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
    const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const startTime = dayjs()
      .add(Math.floor(Math.random() * 30) + 1, "days")
      .hour(Math.floor(Math.random() * 8) + 9)
      .minute(Math.random() > 0.5 ? 0 : 30)
      .second(0)
      .toDate();

    bookingData.push({
      uid: uuid(),
      title: `${randomEventType.title} - ${faker.company.catchPhrase()}`,
      startTime,
      endTime: dayjs(startTime).add(randomEventType.length, "minutes").toDate(),
      eventTypeId: randomEventType.id,
      userId: randomUser.id,
      status: "ACCEPTED",
      metadata: {},
      responses: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        notes: faker.lorem.sentence(),
      },
    });
  }

  await prisma.booking.createMany({
    data: bookingData,
  });

  console.log(`✅ Created ${bookingData.length} sample bookings`);

  // Final stats
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`\n🎉 Performance test team creation completed!`);
  console.log(`📊 Final Statistics:`);
  console.log(`   - Team: ${team.name} (ID: ${team.id})`);
  console.log(`   - Team URL: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/team/${teamSlug}`);
  console.log(`   - Members: ${TEAM_SIZE}`);
  console.log(`   - Event Types: ${eventTypes.length}`);
  console.log(`   - Sample Bookings: ${bookingData.length}`);
  console.log(`   - Total Duration: ${duration.toFixed(2)} seconds`);
  console.log(`\n📝 Sample user credentials:`);
  console.log(`   - Username: perf-user-${teamSlug}-1`);
  console.log(`   - Password: perf-user-${teamSlug}-1`);
  console.log(`   - Email: perf-user-${teamSlug}-1@example.com`);

  return {
    team,
    eventTypes,
    users: allUsers,
    stats: {
      teamId: team.id,
      teamSlug,
      memberCount: TEAM_SIZE,
      eventTypeCount: eventTypes.length,
      bookingCount: bookingData.length,
      duration,
    },
  };
}

// Run the script
createLargeTeam()
  .then((result) => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error creating performance test team:", error);
    process.exit(1);
  });
