#!/usr/bin/env npx tsx
/**
 * Seed script for testing the Plans settings page.
 *
 * Creates test scenarios for all plan contexts:
 *   1. Team with MONTHLY billing (team-monthly-admin / password123)
 *   2. Team with ANNUALLY billing (team-annual-admin / password123)
 *   3. Personal user with no teams (plans-personal / password123)
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/plans/seed-plans-test.ts
 *   npx tsx packages/features/ee/billing/service/plans/seed-plans-test.ts --skip-stripe
 *   npx tsx packages/features/ee/billing/service/plans/seed-plans-test.ts --cleanup
 */

import "dotenv/config";

import bcrypt from "bcryptjs";
import Stripe from "stripe";

import { prisma } from "@calcom/prisma";
import { BillingPeriod, MembershipRole } from "@calcom/prisma/enums";

const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");
const TEST_PASSWORD = "password123";

const TEAM_MONTHLY_SLUG = "plans-team-monthly";
const TEAM_MONTHLY_ADMIN_EMAIL = "team-monthly-admin@example.com";

const TEAM_ANNUAL_SLUG = "plans-team-annual";
const TEAM_ANNUAL_ADMIN_EMAIL = "team-annual-admin@example.com";

const ORG_MONTHLY_SLUG = "plans-org-monthly";
const ORG_MONTHLY_ADMIN_EMAIL = "org-monthly-admin@example.com";

const ORG_ANNUAL_SLUG = "plans-org-annual";
const ORG_ANNUAL_ADMIN_EMAIL = "org-annual-admin@example.com";

const PERSONAL_USER_EMAIL = "plans-personal@example.com";

const TEAM_MEMBER_EMAILS = [
  "plans-member-1@example.com",
  "plans-member-2@example.com",
];

const ORG_MEMBER_EMAILS = [
  "plans-org-member-1@example.com",
  "plans-org-member-2@example.com",
  "plans-org-member-3@example.com",
];

// Pricing in cents
const TEAM_MONTHLY_PRICE = 1600; // $16/seat/month
const TEAM_ANNUAL_PRICE = 1200; // $12/seat/month (billed annually)
const ORG_MONTHLY_PRICE = 3700; // $37/seat/month
const ORG_ANNUAL_PRICE = 2800; // $28/seat/month (billed annually)

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function getStripeClient(): Stripe | null {
  if (SKIP_STRIPE) {
    console.log("Skipping Stripe API calls (--skip-stripe flag)");
    return null;
  }

  if (!process.env.STRIPE_PRIVATE_KEY) {
    console.log("STRIPE_PRIVATE_KEY not set, skipping Stripe API calls");
    return null;
  }

  return new Stripe(process.env.STRIPE_PRIVATE_KEY, {
    apiVersion: "2020-08-27",
  });
}

async function createTestUser(email: string, name: string, username: string) {
  const hashedPassword = await hashPassword(TEST_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email },
    update: { completedOnboarding: true },
    create: {
      email,
      name,
      username,
      password: { create: { hash: hashedPassword } },
      emailVerified: new Date(),
      completedOnboarding: true,
    },
  });

  return user;
}

async function cleanup() {
  console.log("Cleaning up plans test data...");

  const allEmails = [
    TEAM_MONTHLY_ADMIN_EMAIL,
    TEAM_ANNUAL_ADMIN_EMAIL,
    ORG_MONTHLY_ADMIN_EMAIL,
    ORG_ANNUAL_ADMIN_EMAIL,
    PERSONAL_USER_EMAIL,
    ...TEAM_MEMBER_EMAILS,
    ...ORG_MEMBER_EMAILS,
  ];

  await prisma.user.deleteMany({ where: { email: { in: allEmails } } });

  for (const slug of [TEAM_MONTHLY_SLUG, TEAM_ANNUAL_SLUG]) {
    const team = await prisma.team.findFirst({
      where: { slug, isOrganization: false },
    });
    if (team) {
      await prisma.seatChangeLog.deleteMany({ where: { teamId: team.id } });
      await prisma.teamBilling.deleteMany({ where: { teamId: team.id } });
      await prisma.membership.deleteMany({ where: { teamId: team.id } });
      await prisma.team.delete({ where: { id: team.id } });
      console.log(`  Deleted team: ${slug} (ID: ${team.id})`);
    }
  }

  for (const slug of [ORG_MONTHLY_SLUG, ORG_ANNUAL_SLUG]) {
    const org = await prisma.team.findFirst({
      where: { slug, isOrganization: true },
    });
    if (org) {
      await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });
      await prisma.organizationBilling.deleteMany({ where: { teamId: org.id } });
      await prisma.organizationSettings.deleteMany({ where: { organizationId: org.id } });
      const childTeams = await prisma.team.findMany({ where: { parentId: org.id } });
      for (const t of childTeams) {
        await prisma.membership.deleteMany({ where: { teamId: t.id } });
        await prisma.team.delete({ where: { id: t.id } });
      }
      await prisma.membership.deleteMany({ where: { teamId: org.id } });
      await prisma.team.delete({ where: { id: org.id } });
      console.log(`  Deleted org: ${slug} (ID: ${org.id})`);
    }
  }

  console.log("  Cleanup complete");
}

async function seedTeam(opts: {
  slug: string;
  name: string;
  adminEmail: string;
  adminUsername: string;
  billingPeriod: BillingPeriod;
  pricePerSeat: number;
  stripe: Stripe | null;
}) {
  console.log(`\nCreating ${opts.name}...`);

  let team = await prisma.team.findFirst({
    where: { slug: opts.slug, isOrganization: false },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: opts.name,
        slug: opts.slug,
        isOrganization: false,
      },
    });
  }
  console.log(`  Team: ${team.name} (ID: ${team.id})`);

  const admin = await createTestUser(opts.adminEmail, `${opts.name} Admin`, opts.adminUsername);

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: admin.id, teamId: team.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: admin.id, teamId: team.id, role: MembershipRole.OWNER, accepted: true },
  });

  const members = [];
  for (const email of TEAM_MEMBER_EMAILS) {
    const user = await createTestUser(email, email.split("@")[0], email.split("@")[0]);
    members.push(user);
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: user.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  const seatCount = 1 + members.length;
  const now = new Date();

  // Subscription dates: started 2 months ago, ends based on billing period
  const subscriptionStart = new Date(now);
  subscriptionStart.setMonth(subscriptionStart.getMonth() - 2);

  const subscriptionEnd = new Date(subscriptionStart);
  if (opts.billingPeriod === BillingPeriod.ANNUALLY) {
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
  } else {
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
  }

  const stripeCustomerId = `cus_fake_plans_${opts.slug}_${Date.now()}`;
  const stripeSubscriptionId = `sub_fake_plans_${opts.slug}_${Date.now()}`;
  const stripeSubscriptionItemId = `si_fake_plans_${opts.slug}_${Date.now()}`;

  await prisma.teamBilling.upsert({
    where: { teamId: team.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: opts.billingPeriod,
      pricePerSeat: opts.pricePerSeat,
      paidSeats: seatCount,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
      status: "ACTIVE",
    },
    create: {
      teamId: team.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "ACTIVE",
      planName: "TEAM",
      billingPeriod: opts.billingPeriod,
      pricePerSeat: opts.pricePerSeat,
      paidSeats: seatCount,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
    },
  });

  const periodLabel = opts.billingPeriod === BillingPeriod.ANNUALLY ? "annual" : "monthly";
  console.log(`  Billing: ACTIVE, ${periodLabel}, $${opts.pricePerSeat / 100}/seat, ${seatCount} seats`);
  console.log(`  Period: ${subscriptionStart.toISOString()} -> ${subscriptionEnd.toISOString()}`);
  console.log(`  Login: ${opts.adminEmail} / ${TEST_PASSWORD}`);

  return team;
}

async function createTestOrgUser(email: string, name: string, username: string, organizationId: number) {
  const hashedPassword = await hashPassword(TEST_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email },
    update: { completedOnboarding: true, organizationId },
    create: {
      email,
      name,
      username,
      password: { create: { hash: hashedPassword } },
      emailVerified: new Date(),
      completedOnboarding: true,
      organizationId,
    },
  });

  await prisma.profile.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    update: {},
    create: {
      uid: `${user.id}-${organizationId}`,
      userId: user.id,
      organizationId,
      username,
    },
  });

  return user;
}

async function seedOrg(opts: {
  slug: string;
  name: string;
  adminEmail: string;
  adminUsername: string;
  billingPeriod: BillingPeriod;
  pricePerSeat: number;
  stripe: Stripe | null;
}) {
  console.log(`\nCreating ${opts.name}...`);

  let org = await prisma.team.findFirst({
    where: { slug: opts.slug, isOrganization: true },
  });

  if (!org) {
    org = await prisma.team.create({
      data: {
        name: opts.name,
        slug: opts.slug,
        isOrganization: true,
      },
    });
  }
  console.log(`  Organization: ${org.name} (ID: ${org.id})`);

  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      orgAutoAcceptEmail: "example.com",
      isOrganizationConfigured: true,
      isOrganizationVerified: true,
    },
  });

  const admin = await createTestOrgUser(opts.adminEmail, `${opts.name} Admin`, opts.adminUsername, org.id);

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: admin.id, teamId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: admin.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
  });

  const members = [];
  for (const email of ORG_MEMBER_EMAILS) {
    const username = email.split("@")[0];
    const user = await createTestOrgUser(email, username, username, org.id);
    members.push(user);
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: org.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: user.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  const seatCount = 1 + members.length;
  const now = new Date();

  const subscriptionStart = new Date(now);
  subscriptionStart.setMonth(subscriptionStart.getMonth() - 2);

  const subscriptionEnd = new Date(subscriptionStart);
  if (opts.billingPeriod === BillingPeriod.ANNUALLY) {
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
  } else {
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
  }

  const stripeCustomerId = `cus_fake_plans_${opts.slug}_${Date.now()}`;
  const stripeSubscriptionId = `sub_fake_plans_${opts.slug}_${Date.now()}`;
  const stripeSubscriptionItemId = `si_fake_plans_${opts.slug}_${Date.now()}`;

  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: opts.billingPeriod,
      pricePerSeat: opts.pricePerSeat,
      paidSeats: seatCount,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
      status: "ACTIVE",
    },
    create: {
      teamId: org.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "ACTIVE",
      planName: "ORGANIZATION",
      billingPeriod: opts.billingPeriod,
      pricePerSeat: opts.pricePerSeat,
      paidSeats: seatCount,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
    },
  });

  const periodLabel = opts.billingPeriod === BillingPeriod.ANNUALLY ? "annual" : "monthly";
  console.log(`  Billing: ACTIVE, ${periodLabel}, $${opts.pricePerSeat / 100}/seat, ${seatCount} seats`);
  console.log(`  Period: ${subscriptionStart.toISOString()} -> ${subscriptionEnd.toISOString()}`);
  console.log(`  Login: ${opts.adminEmail} / ${TEST_PASSWORD}`);

  return org;
}

async function main() {
  if (CLEANUP_FIRST) {
    await cleanup();
    if (!process.argv.some((a) => !a.startsWith("--") || a === "--cleanup")) {
      process.exit(0);
    }
  }

  const stripe = getStripeClient();

  // 1. Team with monthly billing
  await seedTeam({
    slug: TEAM_MONTHLY_SLUG,
    name: "Plans Monthly Team",
    adminEmail: TEAM_MONTHLY_ADMIN_EMAIL,
    adminUsername: "team-monthly-admin",
    billingPeriod: BillingPeriod.MONTHLY,
    pricePerSeat: TEAM_MONTHLY_PRICE,
    stripe,
  });

  // 2. Team with annual billing
  await seedTeam({
    slug: TEAM_ANNUAL_SLUG,
    name: "Plans Annual Team",
    adminEmail: TEAM_ANNUAL_ADMIN_EMAIL,
    adminUsername: "team-annual-admin",
    billingPeriod: BillingPeriod.ANNUALLY,
    pricePerSeat: TEAM_ANNUAL_PRICE,
    stripe,
  });

  // 3. Org with monthly billing
  await seedOrg({
    slug: ORG_MONTHLY_SLUG,
    name: "Plans Monthly Org",
    adminEmail: ORG_MONTHLY_ADMIN_EMAIL,
    adminUsername: "org-monthly-admin",
    billingPeriod: BillingPeriod.MONTHLY,
    pricePerSeat: ORG_MONTHLY_PRICE,
    stripe,
  });

  // 4. Org with annual billing
  await seedOrg({
    slug: ORG_ANNUAL_SLUG,
    name: "Plans Annual Org",
    adminEmail: ORG_ANNUAL_ADMIN_EMAIL,
    adminUsername: "org-annual-admin",
    billingPeriod: BillingPeriod.ANNUALLY,
    pricePerSeat: ORG_ANNUAL_PRICE,
    stripe,
  });

  // 5. Personal user (no teams)
  const personalUser = await createTestUser(PERSONAL_USER_EMAIL, "Plans Personal User", "plans-personal");
  console.log(`\nPersonal user created (ID: ${personalUser.id})`);
  console.log(`  Login: ${PERSONAL_USER_EMAIL} / ${TEST_PASSWORD}`);

  console.log("\n=== Plans seed complete ===");
  console.log("\nTest accounts:");
  console.log(`  Personal (no teams):  ${PERSONAL_USER_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`  Team (monthly):       ${TEAM_MONTHLY_ADMIN_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`  Team (annual):        ${TEAM_ANNUAL_ADMIN_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`  Org (monthly):        ${ORG_MONTHLY_ADMIN_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`  Org (annual):         ${ORG_ANNUAL_ADMIN_EMAIL} / ${TEST_PASSWORD}`);
  console.log("\nPages to test:");
  console.log("  /settings/billing/plans              (personal context)");
  console.log("  /settings/teams/<id>/plans            (team context)");
  console.log("  /settings/organizations/plans         (org context)");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
