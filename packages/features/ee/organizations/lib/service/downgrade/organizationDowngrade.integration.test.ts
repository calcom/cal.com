import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { Team, User, EventType, Workflow, Membership } from "@calcom/prisma/client";
import { MembershipRole, BillingPeriod } from "@calcom/prisma/enums";

import { OrganizationDowngradeFactory } from "./OrganizationDowngradeFactory";

/**
 * Comprehensive Integration Test for Organization Downgrade
 *
 * This test creates a complex organization with:
 * - 20+ users across multiple teams
 * - Conflicting usernames (users with same name in different contexts)
 * - Organization-level and team-level event types
 * - Workflows attached to events
 * - Billing credits at org level
 * - Active Stripe subscription
 * - Multiple sub-teams with overlapping members
 * - Organization-only members (not in any team)
 */
describe("Organization Downgrade - Complex Integration Test", () => {
  let organizationId: number;
  let organization: Team;
  let orgOwner: User;
  let adminUser: User;

  // Teams
  let engineeringTeam: Team;
  let salesTeam: Team;
  let marketingTeam: Team;

  // Users
  let users: User[];
  let orgOnlyUsers: User[];

  // Conflicting usernames (exist both inside and outside org)
  let conflictingUsers: { inside: User; outside: User }[];

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData();

    /**
     * Step 1: Create Organization Owner and Admin
     */
    orgOwner = await prisma.user.create({
      data: {
        email: "org-owner@test.com",
        username: "orgowner",
        name: "Organization Owner",
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: "admin@test.com",
        username: "admin",
        name: "Admin User",
        role: "ADMIN",
      },
    });

    /**
     * Step 2: Create Organization with metadata
     */
    organization = await prisma.team.create({
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

    organizationId = organization.id;

    // Create organization profile for orgOwner (instead of deprecated organizationId field)
    await prisma.profile.create({
      data: {
        uid: `org-profile-${orgOwner.id}`,
        userId: orgOwner.id,
        organizationId,
        username: orgOwner.username!,
      },
    });

    /**
     * Step 2a: Create credit balance for organization
     */
    await prisma.creditBalance.create({
      data: {
        teamId: organizationId,
        additionalCredits: 1000, // Organization has 1000 credits
      },
    });

    /**
     * Step 3: Create conflicting users (exist both in org and globally)
     */
    conflictingUsers = [];

    for (let i = 0; i < 3; i++) {
      // Create user outside org with username
      const outsideUser = await prisma.user.create({
        data: {
          email: `outside-john${i}@external.com`,
          username: `john`, // Will conflict!
          name: `John External ${i}`,
        },
      });

      // Create user inside org with same username
      const insideUser = await prisma.user.create({
        data: {
          email: `john${i}@acmecorp.com`,
          username: `john`, // Same username, but org-scoped
          name: `John Acme ${i}`,
        },
      });

      // Create organization profile for this user
      await prisma.profile.create({
        data: {
          uid: `org-profile-john-${i}`,
          userId: insideUser.id,
          organizationId,
          username: `john`,
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

    /**
     * Step 4: Create regular users (no conflicts)
     */
    users = [];
    for (let i = 0; i < 15; i++) {
      const user = await prisma.user.create({
        data: {
          email: `user${i}@acmecorp.com`,
          username: `user${i}`,
          name: `User ${i}`,
        },
      });

      // Create organization profile for this user
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

    /**
     * Step 5: Create organization-only members (not in any team)
     */
    orgOnlyUsers = [];
    for (let i = 0; i < 3; i++) {
      const user = await prisma.user.create({
        data: {
          email: `orgonly${i}@acmecorp.com`,
          username: `orgonly${i}`,
          name: `Org Only ${i}`,
        },
      });

      // Create organization profile for this user
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

    /**
     * Step 6: Create conflicting team (exists globally with same slug)
     */
    await prisma.team.create({
      data: {
        name: "External Engineering",
        slug: "engineering", // Will conflict with org's engineering team!
        isOrganization: false,
      },
    });

    /**
     * Step 7: Create sub-teams with overlapping members
     */

    // Engineering Team (10 members)
    engineeringTeam = await prisma.team.create({
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

    // Sales Team (6 members, some overlap with engineering)
    salesTeam = await prisma.team.create({
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

    // Marketing Team (5 members)
    marketingTeam = await prisma.team.create({
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

    /**
     * Step 8: Create organization-level event types
     */
    await prisma.eventType.create({
      data: {
        title: "Org-wide Meeting",
        slug: "org-meeting",
        length: 30,
        teamId: organizationId,
        userId: orgOwner.id,
      },
    });

    /**
     * Step 9: Create team-level event types with hosts
     */
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

    /**
     * Step 10: Create workflows attached to event types
     */
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

    /**
     * Step 11: Create organization onboarding record (for billing tracking)
     */
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
      },
    });

    /**
     * Step 12: Create some bookings to ensure they're preserved
     */
    await prisma.booking.create({
      data: {
        uid: "test-booking-1",
        title: "Test Booking",
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000),
        eventTypeId: engineeringEvent.id,
        userId: users[0].id,
      },
    });

    /**
     * Step 13: Create TempOrgRedirects to test cleanup
     */
    await prisma.tempOrgRedirect.create({
      data: {
        from: `/acmecorp/old-path`,
        fromOrgId: organizationId,
        type: "user",
        toUrl: `/new-path`,
        enabled: true,
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  /**
   * Main Test: Execute full downgrade and verify all aspects
   */
  it("should successfully downgrade complex organization with all features", async () => {
    // Step 1: Validate downgrade
    const downgradeService = OrganizationDowngradeFactory.create();
    const validation = await downgradeService.validateDowngrade(organizationId);

    expect(validation.canDowngrade).toBe(true);
    expect(validation.blockers).toHaveLength(0);
    expect(validation.warnings.length).toBeGreaterThan(0);

    // Check conflict resolutions preview
    expect(validation.conflictResolutions.usernames.length).toBeGreaterThan(0);
    expect(validation.conflictResolutions.teamSlugs.length).toBeGreaterThan(0);

    // Verify conflicting usernames are detected
    const johnConflicts = validation.conflictResolutions.usernames.filter(
      (u) => u.originalUsername === "john" && u.hadConflict
    );
    expect(johnConflicts.length).toBe(3); // All 3 "john" users should have conflicts

    // Verify all johns get "john-acmecorp" pattern
    johnConflicts.forEach((conflict, idx) => {
      if (idx === 0) {
        expect(conflict.resolvedUsername).toBe("john-acmecorp");
      } else {
        expect(conflict.resolvedUsername).toBe(`john-acmecorp-${idx}`);
      }
    });

    // Verify conflicting team slug
    const engineeringConflict = validation.conflictResolutions.teamSlugs.find(
      (t) => t.originalSlug === "engineering"
    );
    expect(engineeringConflict).toBeDefined();
    expect(engineeringConflict?.hadConflict).toBe(true);
    expect(engineeringConflict?.resolvedSlug).toBe("engineering-acmecorp");

    // Step 2: Execute downgrade
    const result = await downgradeService.downgradeOrganization(organizationId, adminUser.id);

    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.teams).toHaveLength(3); // Engineering, Sales, Marketing
    expect(result.removedMembers).toHaveLength(3); // The 3 org-only users

    // Step 3: Verify teams are extracted
    const extractedTeams = await prisma.team.findMany({
      where: {
        id: { in: result.teams.map((t) => t.teamId) },
      },
      include: {
        members: true,
        parent: true,
      },
    });

    expect(extractedTeams).toHaveLength(3);

    // All teams should have no parent
    extractedTeams.forEach((team) => {
      expect(team.parentId).toBeNull();
      expect(team.parent).toBeNull();
    });

    // Engineering team should have new slug due to conflict
    const engineering = extractedTeams.find((t) => t.name === "Engineering");
    expect(engineering?.slug).toBe("engineering-acmecorp");

    // Sales and Marketing should keep original slugs (no conflicts)
    const sales = extractedTeams.find((t) => t.name === "Sales");
    expect(sales?.slug).toBe("sales");

    const marketing = extractedTeams.find((t) => t.name === "Marketing");
    expect(marketing?.slug).toBe("marketing");

    // Step 4: Verify usernames are resolved
    const resolvedUsers = await prisma.user.findMany({
      where: {
        id: { in: conflictingUsers.map((pair) => pair.inside.id) },
      },
    });

    // All "john" users should have new usernames with -acmecorp suffix
    resolvedUsers.forEach((user, idx) => {
      if (idx === 0) {
        expect(user.username).toBe("john-acmecorp");
      } else {
        expect(user.username).toBe(`john-acmecorp-${idx}`);
      }
    });

    // Verify organization profiles were deleted for these users
    const orgProfilesForResolvedUsers = await prisma.profile.count({
      where: {
        userId: { in: conflictingUsers.map((pair) => pair.inside.id) },
        organizationId,
      },
    });
    expect(orgProfilesForResolvedUsers).toBe(0);

    // Step 5: Verify redirects are created
    const redirects = await prisma.tempOrgRedirect.findMany({
      where: {
        from: { startsWith: "/acmecorp/" },
      },
    });

    expect(redirects.length).toBeGreaterThan(0);

    // Check for username redirects
    const usernameRedirects = redirects.filter((r) => r.type === "user");
    expect(usernameRedirects.length).toBeGreaterThan(0);

    // Check for team redirects
    const teamRedirects = redirects.filter((r) => r.type === "team");
    expect(teamRedirects.length).toBeGreaterThan(0);

    // Specific check for engineering team redirect
    const engineeringRedirect = teamRedirects.find((r) =>
      r.from.includes("/engineering")
    );
    expect(engineeringRedirect).toBeDefined();
    expect(engineeringRedirect?.toUrl).toBe("/engineering-acmecorp");

    // Step 6: Verify credits are distributed
    const teamCreditBalances = await prisma.creditBalance.findMany({
      where: {
        teamId: { in: result.teams.map((t) => t.teamId) },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        purchaseLogs: true,
      },
    });

    // All 3 teams should have credit balances
    expect(teamCreditBalances).toHaveLength(3);

    // Each team should have received a portion of the 1000 credits
    const creditsPerTeam = Math.floor(1000 / 3); // 333 credits each
    const remainderCredits = 1000 % 3; // 1 credit remainder
    const totalCreditsDistributed = teamCreditBalances.reduce(
      (sum, cb) => sum + cb.additionalCredits,
      0
    );

    // Verify total credits match what was in the organization
    expect(totalCreditsDistributed).toBe(1000);

    // Each team should have close to the expected amount
    teamCreditBalances.forEach((creditBalance) => {
      // Allow for the remainder to be distributed (one team gets extra)
      expect(creditBalance.additionalCredits).toBeGreaterThanOrEqual(creditsPerTeam);
      expect(creditBalance.additionalCredits).toBeLessThanOrEqual(creditsPerTeam + remainderCredits);

      // Verify purchase log exists for the credit transfer
      expect(creditBalance.purchaseLogs.length).toBeGreaterThan(0);
      const transferLog = creditBalance.purchaseLogs.find(
        (log) => log.credits === creditBalance.additionalCredits
      );
      expect(transferLog).toBeDefined();
    });

    // Step 7: Verify organization is deleted
    const deletedOrg = await prisma.team.findUnique({
      where: { id: organizationId },
    });
    expect(deletedOrg).toBeNull();

    // Step 8: Verify organization-only members are removed
    const orgOnlyMembershipsRemaining = await prisma.membership.count({
      where: {
        userId: { in: orgOnlyUsers.map((u) => u.id) },
      },
    });
    expect(orgOnlyMembershipsRemaining).toBe(0);

    // Verify org-only users have organization profiles deleted
    const orgOnlyProfiles = await prisma.profile.count({
      where: {
        userId: { in: orgOnlyUsers.map((u) => u.id) },
        organizationId,
      },
    });
    expect(orgOnlyProfiles).toBe(0);

    // Step 9: Verify organization profiles are deleted
    const orgProfiles = await prisma.profile.count({
      where: { organizationId },
    });
    expect(orgProfiles).toBe(0);

    // Step 10: Verify team memberships are preserved
    const engineeringMemberships = await prisma.membership.count({
      where: { teamId: engineering!.id },
    });
    expect(engineeringMemberships).toBe(10); // Should still have all 10 members

    const salesMemberships = await prisma.membership.count({
      where: { teamId: sales!.id },
    });
    expect(salesMemberships).toBe(6);

    const marketingMemberships = await prisma.membership.count({
      where: { teamId: marketing!.id },
    });
    expect(marketingMemberships).toBe(5);

    // Step 11: Verify event types are preserved
    const eventTypes = await prisma.eventType.findMany({
      where: {
        teamId: { in: result.teams.map((t) => t.teamId) },
      },
      include: {
        hosts: true,
      },
    });

    expect(eventTypes.length).toBeGreaterThan(0);

    // Verify hosts are still attached
    const engEvent = eventTypes.find((e) => e.slug === "eng-sync");
    expect(engEvent?.hosts.length).toBe(3);

    // Step 12: Verify workflows are preserved
    const workflows = await prisma.workflow.findMany({
      where: {
        teamId: { in: result.teams.map((t) => t.teamId) },
      },
    });

    expect(workflows.length).toBe(2); // Reminder + Followup

    // Step 13: Verify bookings are preserved
    const bookings = await prisma.booking.count({
      where: {
        eventTypeId: { in: eventTypes.map((e) => e.id) },
      },
    });
    expect(bookings).toBeGreaterThan(0);

    // Step 14: Verify metadata is set for billing setup
    const teamsRequiringBilling = await prisma.team.findMany({
      where: {
        id: { in: result.teams.map((t) => t.teamId) },
        metadata: {
          path: ["requiresPaymentSetup"],
          equals: true,
        },
      },
    });
    expect(teamsRequiringBilling.length).toBe(3); // All teams need billing setup
  });

  /**
   * Test: Verify transaction rollback on failure
   */
  it("should rollback all changes if downgrade fails mid-process", async () => {
    // Get initial state
    const initialOrg = await prisma.team.findUnique({
      where: { id: organizationId },
      include: {
        members: true,
      },
    });

    const initialTeams = await prisma.team.findMany({
      where: { parentId: organizationId },
    });

    // Get initial users via organization profiles
    const initialProfiles = await prisma.profile.findMany({
      where: { organizationId },
      select: { userId: true },
    });
    const initialUserIds = initialProfiles.map((p) => p.userId);

    // Mock a failure in the middle of the transaction
    // In a real scenario, this could be a database constraint violation
    // For testing, we'll create an invalid state

    // Create a team with the same slug that will be generated
    await prisma.team.create({
      data: {
        name: "Conflict Team",
        slug: "engineering-acmecorp",
        isOrganization: false,
      },
    });

    const downgradeService = OrganizationDowngradeFactory.create();

    // This should fail due to slug conflict during transaction
    const result = await downgradeService.downgradeOrganization(organizationId, adminUser.id);

    // Downgrade should fail
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();

    // Verify organization still exists (rollback worked)
    const orgAfterFailure = await prisma.team.findUnique({
      where: { id: organizationId },
      include: {
        members: true,
      },
    });

    expect(orgAfterFailure).not.toBeNull();
    expect(orgAfterFailure?.members.length).toBe(initialOrg?.members.length);

    // Verify teams still have parentId (not extracted)
    const teamsAfterFailure = await prisma.team.findMany({
      where: { id: { in: initialTeams.map((t) => t.id) } },
    });

    teamsAfterFailure.forEach((team) => {
      expect(team.parentId).toBe(organizationId);
    });

    // Verify organization profiles still exist (transaction rolled back)
    const profilesAfterFailure = await prisma.profile.count({
      where: {
        userId: { in: initialUserIds },
        organizationId,
      },
    });
    expect(profilesAfterFailure).toBe(initialProfiles.length);
  });

  /**
   * Test: Verify cost estimation accuracy
   */
  it("should accurately estimate costs before and after downgrade", async () => {
    const downgradeService = OrganizationDowngradeFactory.create();
    const validation = await downgradeService.validateDowngrade(organizationId);

    // Current org cost
    expect(validation.estimatedCost.current.seats).toBe(30);
    expect(validation.estimatedCost.current.pricePerSeat).toBe(15);
    expect(validation.estimatedCost.current.totalMonthly).toBe(450); // 30 * 15

    // After downgrade cost (3 teams with different member counts)
    expect(validation.estimatedCost.afterDowngrade.teams).toHaveLength(3);

    const engineeringCost = validation.estimatedCost.afterDowngrade.teams.find(
      (t) => t.teamName === "Engineering"
    );
    expect(engineeringCost?.seats).toBe(10);

    const salesCost = validation.estimatedCost.afterDowngrade.teams.find(
      (t) => t.teamName === "Sales"
    );
    expect(salesCost?.seats).toBe(6);

    const marketingCost = validation.estimatedCost.afterDowngrade.teams.find(
      (t) => t.teamName === "Marketing"
    );
    expect(marketingCost?.seats).toBe(5);

    // Total after should be sum of all team costs
    const totalAfter = validation.estimatedCost.afterDowngrade.totalMonthly;
    expect(totalAfter).toBeGreaterThan(0);
  });
});

/**
 * Helper function to clean up test data
 */
async function cleanupTestData() {
  // Delete in correct order due to foreign key constraints

  // Clean up credit tables first
  await prisma.creditExpenseLog.deleteMany({
    where: {
      creditBalance: {
        OR: [
          { team: { slug: { contains: "acmecorp" } } },
          { team: { slug: { in: ["engineering", "sales", "marketing"] } } },
        ],
      },
    },
  });

  await prisma.creditPurchaseLog.deleteMany({
    where: {
      creditBalance: {
        OR: [
          { team: { slug: { contains: "acmecorp" } } },
          { team: { slug: { in: ["engineering", "sales", "marketing"] } } },
        ],
      },
    },
  });

  await prisma.creditBalance.deleteMany({
    where: {
      OR: [
        { team: { slug: { contains: "acmecorp" } } },
        { team: { slug: { in: ["engineering", "sales", "marketing"] } } },
      ],
    },
  });

  await prisma.workflowsOnEventTypes.deleteMany({
    where: {
      eventType: {
        OR: [
          { slug: { contains: "test" } },
          { slug: { contains: "eng-sync" } },
          { slug: { contains: "sales-demo" } },
          { slug: { contains: "org-meeting" } },
        ],
      },
    },
  });

  await prisma.workflow.deleteMany({
    where: {
      OR: [
        { name: { contains: "Meeting Reminder" } },
        { name: { contains: "Sales Followup" } },
      ],
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
      OR: [
        { from: { contains: "acmecorp" } },
        { from: { contains: "test" } },
      ],
    },
  });

  await prisma.membership.deleteMany({
    where: {
      user: {
        email: { contains: "@acmecorp.com" },
      },
    },
  });

  await prisma.membership.deleteMany({
    where: {
      user: {
        email: { contains: "@test.com" },
      },
    },
  });

  await prisma.organizationOnboarding.deleteMany({
    where: {
      slug: "acmecorp",
    },
  });

  await prisma.profile.deleteMany({
    where: {
      user: {
        email: { contains: "@acmecorp.com" },
      },
    },
  });

  await prisma.team.deleteMany({
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
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: "@acmecorp.com" } },
        { email: { contains: "@test.com" } },
        { email: { contains: "@external.com" } },
      ],
    },
  });
}
