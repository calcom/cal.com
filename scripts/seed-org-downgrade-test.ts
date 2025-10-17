import { prisma } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { MembershipRole, BillingPeriod } from "@calcom/prisma/enums";

async function main() {
  console.log("🌱 Seeding complex organization for downgrade UI testing...\n");

  await cleanupTestData();

  console.log("Step 1: Creating Organization Owner...");
  const orgOwner = await prisma.user.create({
    data: {
      email: "org-owner@test.com",
      username: "orgowner",
      name: "Organization Owner",
    },
  });

  console.log("Step 2: Creating Organization 'Acme Corporation'...");
  const organization = await prisma.team.create({
    data: {
      name: "Acme Corporation",
      slug: "acmecorp",
      isOrganization: true,
      metadata: {
        subscriptionId: "sub_test123456",
        subscriptionItemId: "si_test123456",
        orgSeats: 30,
        pricePerSeat: 15,
      },
      members: {
        create: {
          userId: orgOwner.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
    },
  });

  const organizationId = organization.id;

  await prisma.profile.create({
    data: {
      uid: `org-profile-${orgOwner.id}`,
      userId: orgOwner.id,
      organizationId,
      username: orgOwner.username!,
    },
  });

  console.log("Step 2a: Creating credit balance (1000 credits)...");
  await prisma.creditBalance.create({
    data: {
      teamId: organizationId,
      additionalCredits: 1000,
    },
  });

  console.log("Step 3: Creating conflicting users (3 'john' users with external conflicts)...");
  const conflictingUsers: { inside: User; outside: User }[] = [];

  for (let i = 0; i < 3; i++) {
    const outsideUser = await prisma.user.create({
      data: {
        email: `outside-john${i}@external.com`,
        username: `john${i}-external`,
        name: `John External ${i}`,
      },
    });

    const insideUser = await prisma.user.create({
      data: {
        email: `john${i}@acmecorp.com`,
        username: `john${i}-acme`,
        name: `John Acme ${i}`,
      },
    });

    await prisma.profile.create({
      data: {
        uid: `org-profile-john-${i}`,
        userId: insideUser.id,
        organizationId,
        username: `john${i}`,
      },
    });

    await prisma.membership.create({
      data: {
        userId: insideUser.id,
        teamId: organizationId,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });

    conflictingUsers.push({ inside: insideUser, outside: outsideUser });
  }

  console.log("Step 4: Creating regular users (15 users)...");
  const users: User[] = [];
  for (let i = 0; i < 15; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@acmecorp.com`,
        username: `user${i}`,
        name: `User ${i}`,
      },
    });

    await prisma.profile.create({
      data: {
        uid: `org-profile-user-${i}`,
        userId: user.id,
        organizationId,
        username: `user${i}`,
      },
    });

    await prisma.membership.create({
      data: {
        userId: user.id,
        teamId: organizationId,
        role: i < 3 ? MembershipRole.ADMIN : MembershipRole.MEMBER,
        accepted: true,
      },
    });

    users.push(user);
  }

  console.log("Step 5: Creating organization-only members (3 users not in any team)...");
  const orgOnlyUsers: User[] = [];
  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.create({
      data: {
        email: `orgonly${i}@acmecorp.com`,
        username: `orgonly${i}`,
        name: `Org Only ${i}`,
      },
    });

    await prisma.profile.create({
      data: {
        uid: `org-profile-orgonly-${i}`,
        userId: user.id,
        organizationId,
        username: `orgonly${i}`,
      },
    });

    await prisma.membership.create({
      data: {
        userId: user.id,
        teamId: organizationId,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });

    orgOnlyUsers.push(user);
  }

  console.log("Step 6: Creating conflicting external team (slug: 'engineering')...");
  await prisma.team.create({
    data: {
      name: "External Engineering",
      slug: "engineering",
      isOrganization: false,
    },
  });

  console.log("Step 7: Creating sub-teams with overlapping members...");

  const engineeringTeam = await prisma.team.create({
    data: {
      name: "Engineering",
      slug: "engineering",
      parentId: organizationId,
      members: {
        create: [
          ...users.slice(0, 8).map((user) => ({
            userId: user.id,
            role: user.id === users[0].id ? MembershipRole.ADMIN : MembershipRole.MEMBER,
            accepted: true,
          })),
          ...conflictingUsers.slice(0, 2).map((pair) => ({
            userId: pair.inside.id,
            role: MembershipRole.MEMBER,
            accepted: true,
          })),
        ],
      },
    },
  });
  console.log(`  - Engineering Team (10 members)`);

  const salesTeam = await prisma.team.create({
    data: {
      name: "Sales",
      slug: "sales",
      parentId: organizationId,
      members: {
        create: [
          ...users.slice(5, 10).map((user) => ({
            userId: user.id,
            role: user.id === users[5].id ? MembershipRole.ADMIN : MembershipRole.MEMBER,
            accepted: true,
          })),
          {
            userId: conflictingUsers[2].inside.id,
            role: MembershipRole.MEMBER,
            accepted: true,
          },
        ],
      },
    },
  });
  console.log(`  - Sales Team (6 members, some overlap with Engineering)`);

  await prisma.team.create({
    data: {
      name: "Marketing",
      slug: "marketing",
      parentId: organizationId,
      members: {
        create: users.slice(10, 15).map((user, idx) => ({
          userId: user.id,
          role: idx === 0 ? MembershipRole.ADMIN : MembershipRole.MEMBER,
          accepted: true,
        })),
      },
    },
  });
  console.log(`  - Marketing Team (5 members)`);

  console.log("Step 8: Creating organization-level event type...");
  await prisma.eventType.create({
    data: {
      title: "Org-wide Meeting",
      slug: "org-meeting",
      length: 30,
      teamId: organizationId,
      userId: orgOwner.id,
    },
  });

  console.log("Step 9: Creating team-level event types with hosts...");
  const engineeringEvent = await prisma.eventType.create({
    data: {
      title: "Engineering Sync",
      slug: "eng-sync",
      length: 60,
      teamId: engineeringTeam.id,
      userId: users[0].id,
      hosts: {
        create: [
          { userId: users[0].id, isFixed: true },
          { userId: users[1].id, isFixed: false },
          { userId: conflictingUsers[0].inside.id, isFixed: false },
        ],
      },
    },
  });

  const salesEvent = await prisma.eventType.create({
    data: {
      title: "Sales Demo",
      slug: "sales-demo",
      length: 45,
      teamId: salesTeam.id,
      userId: users[5].id,
      hosts: {
        create: [
          { userId: users[5].id, isFixed: true },
          { userId: users[6].id, isFixed: false },
        ],
      },
    },
  });

  console.log("Step 10: Creating workflows attached to event types...");
  const reminderWorkflow = await prisma.workflow.create({
    data: {
      name: "Meeting Reminder",
      teamId: engineeringTeam.id,
      userId: users[0].id,
      trigger: "BEFORE_EVENT",
      time: 60,
      timeUnit: "MINUTE",
    },
  });

  await prisma.workflowsOnEventTypes.create({
    data: {
      workflowId: reminderWorkflow.id,
      eventTypeId: engineeringEvent.id,
    },
  });

  const followupWorkflow = await prisma.workflow.create({
    data: {
      name: "Sales Followup",
      teamId: salesTeam.id,
      userId: users[5].id,
      trigger: "AFTER_EVENT",
      time: 24,
      timeUnit: "HOUR",
    },
  });

  await prisma.workflowsOnEventTypes.create({
    data: {
      workflowId: followupWorkflow.id,
      eventTypeId: salesEvent.id,
    },
  });

  console.log("Step 11: Creating organization onboarding record (billing tracking)...");
  await prisma.organizationOnboarding.create({
    data: {
      organizationId,
      name: organization.name,
      slug: organization.slug!,
      orgOwnerEmail: orgOwner.email,
      seats: 30,
      pricePerSeat: 15,
      billingPeriod: BillingPeriod.MONTHLY,
      isComplete: true,
      stripeCustomerId: "cus_test123456",
      stripeSubscriptionId: "sub_test123456",
      stripeSubscriptionItemId: "si_test123456",
      createdById: orgOwner.id,
    },
  });

  console.log("Step 12: Creating sample bookings...");
  await prisma.booking.create({
    data: {
      uid: "test-booking-1",
      title: "Test Booking",
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 90000000),
      eventTypeId: engineeringEvent.id,
      userId: users[0].id,
    },
  });

  console.log("Step 13: Creating TempOrgRedirects for cleanup testing...");
  await prisma.tempOrgRedirect.create({
    data: {
      from: `/acmecorp/old-path`,
      fromOrgId: organizationId,
      type: "User",
      toUrl: `/new-path`,
      enabled: true,
    },
  });

  console.log("\n✅ Seeding complete!\n");
  console.log("Organization Details:");
  console.log(`  - Organization: Acme Corporation (acmecorp)`);
  console.log(`  - Organization ID: ${organizationId}`);
  console.log(`  - Owner: org-owner@test.com (orgowner)`);
  console.log(`  - Total Members: ${3 + 15 + 3} (21 users)`);
  console.log(`  - Sub-teams: 3 (Engineering, Sales, Marketing)`);
  console.log(`  - Credits: 1000`);
  console.log(`  - Username Conflicts: 3 'john' users`);
  console.log(`  - Team Slug Conflicts: 'engineering' exists externally`);
  console.log(`  - Org-only Members: 3 (will be removed on downgrade)`);
  console.log("\nTest Users:");
  console.log(`  - org-owner@test.com (owner)`);
  console.log(`  - john0@acmecorp.com, john1@acmecorp.com, john2@acmecorp.com (conflicting usernames)`);
  console.log(`  - user0@acmecorp.com through user14@acmecorp.com`);
  console.log(`  - orgonly0@acmecorp.com, orgonly1@acmecorp.com, orgonly2@acmecorp.com`);
}

async function cleanupTestData() {
  console.log("🧹 Cleaning up existing test data...\n");

  const testUserEmails = ["@acmecorp.com", "@test.com", "@external.com"];
  const testUsernames = ["orgowner"];

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...testUserEmails.map((email) => ({ email: { contains: email } })),
        ...testUsernames.map((username) => ({ username: { equals: username } })),
      ],
    },
    select: { id: true },
  });

  const testUserIds = testUsers.map((u) => u.id);

  const testTeams = await prisma.team.findMany({
    where: {
      OR: [
        { slug: { contains: "acmecorp" } },
        { slug: "engineering" },
        { slug: "sales" },
        { slug: "marketing" },
        { name: { contains: "External Engineering" } },
        { name: { contains: "Conflict Team" } },
      ],
    },
    select: { id: true },
  });

  const testTeamIds = testTeams.map((t) => t.id);

  if (testTeamIds.length > 0) {
    await prisma.creditExpenseLog.deleteMany({
      where: { creditBalance: { teamId: { in: testTeamIds } } },
    });

    await prisma.creditPurchaseLog.deleteMany({
      where: { creditBalance: { teamId: { in: testTeamIds } } },
    });

    await prisma.creditBalance.deleteMany({
      where: { teamId: { in: testTeamIds } },
    });
  }

  await prisma.workflowsOnEventTypes.deleteMany({
    where: {
      eventType: {
        slug: { in: ["eng-sync", "sales-demo", "org-meeting"] },
      },
    },
  });

  await prisma.workflow.deleteMany({
    where: {
      name: { in: ["Meeting Reminder", "Sales Followup"] },
    },
  });

  await prisma.host.deleteMany({
    where: {
      eventType: {
        slug: { in: ["eng-sync", "sales-demo", "org-meeting"] },
      },
    },
  });

  await prisma.booking.deleteMany({
    where: {
      uid: { startsWith: "test-booking" },
    },
  });

  await prisma.eventType.deleteMany({
    where: {
      slug: { in: ["eng-sync", "sales-demo", "org-meeting"] },
    },
  });

  await prisma.tempOrgRedirect.deleteMany({
    where: {
      OR: [{ from: { contains: "acmecorp" } }, { from: { contains: "test" } }],
    },
  });

  if (testUserIds.length > 0) {
    await prisma.membership.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    await prisma.profile.deleteMany({
      where: { userId: { in: testUserIds } },
    });
  }

  await prisma.organizationOnboarding.deleteMany({
    where: { slug: "acmecorp" },
  });

  if (testTeamIds.length > 0) {
    await prisma.team.deleteMany({
      where: { id: { in: testTeamIds } },
    });
  }

  if (testUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: testUserIds } },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
