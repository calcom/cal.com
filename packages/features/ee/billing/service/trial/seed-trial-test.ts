#!/usr/bin/env npx tsx
/**
 * Seed script for testing trial billing for teams and organizations.
 *
 * This script creates:
 * 1. A test team with a trialing Stripe subscription
 * 2. A test organization with a trialing Stripe subscription
 * 3. Test users with memberships
 * 4. Real Stripe customers and subscriptions with trial_end set
 *
 * Prerequisites:
 *   - STRIPE_PRIVATE_KEY must be set (use test mode key)
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/trial/seed-trial-test.ts
 *
 * Options:
 *   --skip-stripe    Skip Stripe API calls (use fake IDs)
 *   --cleanup        Clean up test data before seeding
 *   --trial-days <N> Set trial duration in days (default: 14)
 */

import "dotenv/config";

import bcrypt from "bcryptjs";
import Stripe from "stripe";

import { ORGANIZATION_SELF_SERVE_PRICE, TRIAL_LIMIT_DAYS } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { BillingPeriod, MembershipRole } from "@calcom/prisma/enums";

const STRIPE_TEAM_MONTHLY_PRICE_ID = process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
const STRIPE_ORG_MONTHLY_PRICE_ID = process.env.STRIPE_ORG_MONTHLY_PRICE_ID;

const TEAM_PRICE_PER_SEAT_CENTS_FALLBACK = 1500;
const ORG_PRICE_PER_SEAT_CENTS_FALLBACK = ORGANIZATION_SELF_SERVE_PRICE * 100;

const TEST_PASSWORD = "password123";
const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

function parseTrialDaysFromArgs(): number {
  const idx = process.argv.indexOf("--trial-days");
  if (idx === -1) return TRIAL_LIMIT_DAYS;
  const val = parseInt(process.argv[idx + 1], 10);
  if (Number.isNaN(val) || val < 1) return TRIAL_LIMIT_DAYS;
  return val;
}

const TRIAL_DAYS = parseTrialDaysFromArgs();

const TRIAL_TEAM_SLUG = "trial-test-team";
const TRIAL_TEAM_ADMIN_EMAIL = "trial-team-admin@example.com";
const TRIAL_TEAM_MEMBER_EMAILS = Array.from({ length: 3 }, (_, i) => `trial-team-member-${i + 1}@example.com`);

const TRIAL_ORG_SLUG = "trial-test-org";
const TRIAL_ORG_ADMIN_EMAIL = "trial-org-admin@example.com";
const TRIAL_ORG_MEMBER_EMAILS = Array.from({ length: 4 }, (_, i) => `trial-org-member-${i + 1}@example.com`);

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

async function createTestUser(email: string, name: string, username: string, organizationId?: number) {
  const hashedPassword = await hashPassword(TEST_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      completedOnboarding: true,
      organizationId,
    },
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

  if (organizationId) {
    await prisma.profile.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      update: {},
      create: {
        uid: `${user.id}-${organizationId}`,
        userId: user.id,
        organizationId,
        username,
      },
    });
  }

  return user;
}

interface StripeTrialResources {
  customer: Stripe.Customer | null;
  subscription: Stripe.Subscription | null;
  testClock: Stripe.TestHelpers.TestClock | null;
}

async function createStripeTrialSubscription(
  stripe: Stripe,
  entityId: number,
  email: string,
  name: string,
  seatCount: number,
  priceId: string,
  trialDays: number
): Promise<StripeTrialResources & { pricePerSeatCents: number }> {
  console.log(`Creating Stripe trial resources for ${name}...`);

  const price = await stripe.prices.retrieve(priceId);
  if (!price) {
    throw new Error(`Price not found: ${priceId}`);
  }
  const pricePerSeatCents = price.unit_amount || 0;
  console.log(`  Using price: ${price.id} ($${pricePerSeatCents / 100}/seat)`);

  const testClock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: `Trial Test - ${name}`,
  });
  console.log(`  Created test clock: ${testClock.id}`);

  const customer = await stripe.customers.create({
    email,
    name,
    test_clock: testClock.id,
    metadata: {
      testData: "true",
      calTeamId: entityId.toString(),
    },
  });
  console.log(`  Created customer: ${customer.id}`);

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  });

  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });
  console.log(`  Attached payment method: ${paymentMethod.id}`);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id, quantity: seatCount }],
    trial_period_days: trialDays,
    metadata: {
      testData: "true",
      teamId: entityId.toString(),
    },
  });
  console.log(`  Created trial subscription: ${subscription.id} (${seatCount} seats, ${trialDays}-day trial)`);
  console.log(`  Trial ends: ${new Date(subscription.trial_end! * 1000).toISOString()}`);

  return { customer, subscription, testClock, pricePerSeatCents };
}

async function cleanupStripeResources(stripe: Stripe) {
  console.log("Cleaning up existing Stripe trial test resources...");

  const testClocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
  for (const clock of testClocks.data) {
    if (clock.name?.startsWith("Trial Test")) {
      try {
        await stripe.testHelpers.testClocks.del(clock.id);
        console.log(`  Deleted test clock: ${clock.id} (${clock.name})`);
      } catch (error) {
        console.log(`  Could not delete test clock ${clock.id}:`, error);
      }
    }
  }

  const emailsToCleanup = [TRIAL_TEAM_ADMIN_EMAIL, TRIAL_ORG_ADMIN_EMAIL];
  for (const email of emailsToCleanup) {
    const customers = await stripe.customers.list({ limit: 100, email });
    for (const customer of customers.data) {
      try {
        const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: "all" });
        for (const sub of subscriptions.data) {
          if (sub.status !== "canceled") {
            await stripe.subscriptions.cancel(sub.id);
            console.log(`  Cancelled subscription: ${sub.id}`);
          }
        }
        await stripe.customers.del(customer.id);
        console.log(`  Deleted customer: ${customer.id}`);
      } catch (error) {
        console.log(`  Could not delete customer ${customer.id}:`, error);
      }
    }
  }
}

async function cleanupDatabaseResources() {
  console.log("Cleaning up database trial test resources...");

  const testEmails = [
    TRIAL_TEAM_ADMIN_EMAIL,
    ...TRIAL_TEAM_MEMBER_EMAILS,
    TRIAL_ORG_ADMIN_EMAIL,
    ...TRIAL_ORG_MEMBER_EMAILS,
  ];
  const deleteResult = await prisma.user.deleteMany({
    where: { email: { in: testEmails } },
  });
  if (deleteResult.count > 0) {
    console.log(`  Deleted ${deleteResult.count} test users`);
  }

  const team = await prisma.team.findFirst({
    where: { slug: TRIAL_TEAM_SLUG, isOrganization: false },
  });

  if (team) {
    await prisma.seatChangeLog.deleteMany({ where: { teamId: team.id } });
    await prisma.teamBilling.deleteMany({ where: { teamId: team.id } });
    await prisma.membership.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    console.log(`  Deleted trial test team (ID: ${team.id})`);
  }

  const org = await prisma.team.findFirst({
    where: { slug: TRIAL_ORG_SLUG, isOrganization: true },
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
    console.log(`  Deleted trial test org (ID: ${org.id})`);
  }

  console.log("  Database cleanup complete");
}

async function seedTrialTeam(stripe: Stripe | null) {
  console.log("\nCreating trial test team...");

  let team = await prisma.team.findFirst({
    where: { slug: TRIAL_TEAM_SLUG, isOrganization: false },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Trial Test Team",
        slug: TRIAL_TEAM_SLUG,
        isOrganization: false,
      },
    });
  }
  console.log(`  Team created: ${team.name} (ID: ${team.id})`);

  const adminUser = await createTestUser(TRIAL_TEAM_ADMIN_EMAIL, "Trial Team Admin", "trial-team-admin");

  const members = [];
  for (let i = 0; i < TRIAL_TEAM_MEMBER_EMAILS.length; i++) {
    const user = await createTestUser(
      TRIAL_TEAM_MEMBER_EMAILS[i],
      `Trial Team Member ${i + 1}`,
      `trial-team-member-${i + 1}`
    );
    members.push(user);
  }

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: team.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: team.id, role: MembershipRole.OWNER, accepted: true },
  });

  for (const member of members) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: member.id, teamId: team.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: member.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  const seatCount = 1 + members.length; // admin + members
  console.log(`  Users added: ${seatCount} members`);

  let stripeResources: StripeTrialResources = { customer: null, subscription: null, testClock: null };
  let stripeCustomerId = `cus_fake_trial_team_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_trial_team_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_trial_team_${Date.now()}`;
  let teamPricePerSeatCents = TEAM_PRICE_PER_SEAT_CENTS_FALLBACK;

  const now = new Date();
  let subscriptionTrialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  if (stripe) {
    if (!STRIPE_TEAM_MONTHLY_PRICE_ID) {
      throw new Error("STRIPE_TEAM_MONTHLY_PRICE_ID is required when running with Stripe");
    }
    const result = await createStripeTrialSubscription(
      stripe,
      team.id,
      TRIAL_TEAM_ADMIN_EMAIL,
      "Trial Test Team",
      seatCount,
      STRIPE_TEAM_MONTHLY_PRICE_ID,
      TRIAL_DAYS
    );
    stripeResources = result;
    stripeCustomerId = result.customer!.id;
    stripeSubscriptionId = result.subscription!.id;
    stripeSubscriptionItemId = result.subscription!.items.data[0].id;
    teamPricePerSeatCents = result.pricePerSeatCents;
    subscriptionTrialEnd = new Date(result.subscription!.trial_end! * 1000);
  }

  await prisma.teamBilling.upsert({
    where: { teamId: team.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: teamPricePerSeatCents,
      paidSeats: seatCount,
      subscriptionStart: now,
      subscriptionEnd: null,
      subscriptionTrialEnd,
      status: "TRIALING",
    },
    create: {
      teamId: team.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "TRIALING",
      planName: "TEAM",
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: teamPricePerSeatCents,
      paidSeats: seatCount,
      subscriptionStart: now,
      subscriptionEnd: null,
      subscriptionTrialEnd,
    },
  });

  console.log(
    `  TeamBilling created (TRIALING, $${teamPricePerSeatCents / 100}/seat, ${seatCount} seats, trial ends ${subscriptionTrialEnd.toISOString()})`
  );

  return {
    team: { id: team.id, name: team.name, slug: team.slug! },
    seatCount,
    subscriptionTrialEnd,
    stripe: stripeResources,
  };
}

async function seedTrialOrg(stripe: Stripe | null) {
  console.log("\nCreating trial test organization...");

  let org = await prisma.team.findFirst({
    where: { slug: TRIAL_ORG_SLUG, isOrganization: true },
  });

  if (!org) {
    org = await prisma.team.create({
      data: {
        name: "Trial Test Org",
        slug: TRIAL_ORG_SLUG,
        isOrganization: true,
      },
    });
  }
  console.log(`  Organization created: ${org.name} (ID: ${org.id})`);

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

  const adminUser = await createTestUser(TRIAL_ORG_ADMIN_EMAIL, "Trial Org Admin", "trial-org-admin", org.id);

  const members = [];
  for (let i = 0; i < TRIAL_ORG_MEMBER_EMAILS.length; i++) {
    const user = await createTestUser(
      TRIAL_ORG_MEMBER_EMAILS[i],
      `Trial Org Member ${i + 1}`,
      `trial-org-member-${i + 1}`,
      org.id
    );
    members.push(user);
  }

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
  });

  for (const member of members) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: member.id, teamId: org.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: member.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  const seatCount = 1 + members.length;
  console.log(`  Users added: ${seatCount} members`);

  let stripeResources: StripeTrialResources = { customer: null, subscription: null, testClock: null };
  let stripeCustomerId = `cus_fake_trial_org_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_trial_org_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_trial_org_${Date.now()}`;
  let orgPricePerSeatCents = ORG_PRICE_PER_SEAT_CENTS_FALLBACK;

  const now = new Date();
  let subscriptionTrialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  if (stripe) {
    if (!STRIPE_ORG_MONTHLY_PRICE_ID) {
      throw new Error("STRIPE_ORG_MONTHLY_PRICE_ID is required when running with Stripe");
    }
    const result = await createStripeTrialSubscription(
      stripe,
      org.id,
      TRIAL_ORG_ADMIN_EMAIL,
      "Trial Test Org",
      seatCount,
      STRIPE_ORG_MONTHLY_PRICE_ID,
      TRIAL_DAYS
    );
    stripeResources = result;
    stripeCustomerId = result.customer!.id;
    stripeSubscriptionId = result.subscription!.id;
    stripeSubscriptionItemId = result.subscription!.items.data[0].id;
    orgPricePerSeatCents = result.pricePerSeatCents;
    subscriptionTrialEnd = new Date(result.subscription!.trial_end! * 1000);
  }

  await prisma.team.update({
    where: { id: org.id },
    data: {
      metadata: {
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
      },
    },
  });

  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: orgPricePerSeatCents,
      paidSeats: seatCount,
      subscriptionStart: now,
      subscriptionEnd: null,
      subscriptionTrialEnd,
      status: "TRIALING",
    },
    create: {
      teamId: org.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "TRIALING",
      planName: "ORGANIZATION",
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: orgPricePerSeatCents,
      paidSeats: seatCount,
      subscriptionStart: now,
      subscriptionEnd: null,
      subscriptionTrialEnd,
    },
  });

  console.log(
    `  OrganizationBilling created (TRIALING, $${orgPricePerSeatCents / 100}/seat, ${seatCount} seats, trial ends ${subscriptionTrialEnd.toISOString()})`
  );

  return {
    org: { id: org.id, name: org.name, slug: org.slug! },
    seatCount,
    subscriptionTrialEnd,
    stripe: stripeResources,
  };
}

async function main() {
  console.log("=== Trial Billing Test Seed Script ===\n");
  console.log("Options:");
  console.log(`  --skip-stripe: ${SKIP_STRIPE}`);
  console.log(`  --cleanup: ${CLEANUP_FIRST}`);
  console.log(`  --trial-days: ${TRIAL_DAYS}`);
  console.log("");

  try {
    const stripe = getStripeClient();

    if (CLEANUP_FIRST) {
      await cleanupDatabaseResources();
      if (stripe) {
        await cleanupStripeResources(stripe);
      }
    }

    const teamResult = await seedTrialTeam(stripe);
    const orgResult = await seedTrialOrg(stripe);

    console.log("\n=== Seed Complete ===\n");

    const teamSubUrl = teamResult.stripe.subscription
      ? `https://dashboard.stripe.com/test/subscriptions/${teamResult.stripe.subscription.id}`
      : "N/A (--skip-stripe)";
    const teamClockUrl = teamResult.stripe.testClock
      ? `https://dashboard.stripe.com/test/test-clocks/${teamResult.stripe.testClock.id}`
      : "N/A";
    const orgSubUrl = orgResult.stripe.subscription
      ? `https://dashboard.stripe.com/test/subscriptions/${orgResult.stripe.subscription.id}`
      : "N/A (--skip-stripe)";
    const orgClockUrl = orgResult.stripe.testClock
      ? `https://dashboard.stripe.com/test/test-clocks/${orgResult.stripe.testClock.id}`
      : "N/A";

    console.log("=== Summary ===\n");
    console.log(`| Entity | Seats | Status | Trial Ends |`);
    console.log(`|--------|-------|--------|------------|`);
    console.log(
      `| Team (ID:${teamResult.team.id}) | ${teamResult.seatCount} | TRIALING | ${teamResult.subscriptionTrialEnd.toISOString().split("T")[0]} |`
    );
    console.log(
      `| Org (ID:${orgResult.org.id}) | ${orgResult.seatCount} | TRIALING | ${orgResult.subscriptionTrialEnd.toISOString().split("T")[0]} |`
    );

    console.log("\n=== Stripe Resources ===\n");
    console.log("Team:");
    console.log(`  Subscription: ${teamSubUrl}`);
    console.log(`  Test Clock:   ${teamClockUrl}`);
    console.log("\nOrg:");
    console.log(`  Subscription: ${orgSubUrl}`);
    console.log(`  Test Clock:   ${orgClockUrl}`);

    console.log("\n=== Test Users ===\n");
    console.log(`  Team admin:    ${TRIAL_TEAM_ADMIN_EMAIL} (password: ${TEST_PASSWORD})`);
    console.log(`  Team members:  ${TRIAL_TEAM_MEMBER_EMAILS.join(", ")}`);
    console.log(`  Org admin:     ${TRIAL_ORG_ADMIN_EMAIL} (password: ${TEST_PASSWORD})`);
    console.log(`  Org members:   ${TRIAL_ORG_MEMBER_EMAILS.join(", ")}`);

    console.log("\n=== Testing Instructions ===\n");
    console.log("1. VERIFY TRIAL STATUS:");
    console.log(
      `   SELECT "status", "subscriptionTrialEnd" FROM "TeamBilling" WHERE "teamId" = ${teamResult.team.id};`
    );
    console.log(
      `   SELECT "status", "subscriptionTrialEnd" FROM "OrganizationBilling" WHERE "teamId" = ${orgResult.org.id};`
    );
    console.log("");
    console.log("2. SKIP TRIAL (end trial early):");
    console.log("   Log in as the team/org admin and use the skip trial flow.");
    console.log("   This calls TeamBillingService.endTrial() which sets trial_end='now' on Stripe.");
    console.log("");
    console.log("3. ADVANCE TEST CLOCK to end trial naturally:");
    console.log("   Go to the Test Clock URL above and advance time past the trial end date.");
    console.log("   This triggers customer.subscription.updated with status changing from 'trialing' to 'active'.");
    console.log("");
    console.log("4. VERIFY BILLING PERIOD SERVICE:");
    console.log("   The BillingPeriodService checks subscriptionTrialEnd to determine if a team is in trial.");
    console.log("   While in trial, billing enforcement (dunning, proration) should be skipped.");

    console.log("\n=== Cleanup ===\n");
    console.log("To clean up all test data, run:");
    console.log(
      "  npx tsx packages/features/ee/billing/service/trial/seed-trial-test.ts --cleanup --skip-stripe"
    );
    console.log("");
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
