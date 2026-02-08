#!/usr/bin/env npx tsx
/**
 * Seed script for testing High Water Mark (HWM) billing for monthly plans
 *
 * This script creates:
 * 1. A test team with monthly billing and HWM tracking
 * 2. A test organization with monthly billing and HWM tracking
 * 3. Test users with various membership scenarios
 * 4. Real Stripe customers and subscriptions (monthly)
 * 5. Seat change logs to simulate peak usage
 *
 * Prerequisites:
 *   - STRIPE_PRIVATE_KEY must be set (use test mode key)
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/highWaterMark/seed-hwm-test.ts
 *
 * Options:
 *   --skip-stripe    Skip Stripe API calls (use fake IDs)
 *   --cleanup        Clean up test data before seeding
 */

// IMPORTANT: Load environment variables BEFORE any other imports
// The @calcom/prisma module initializes at import time and needs DATABASE_URL
// Using side-effect import ensures dotenv runs before other imports are evaluated
import "dotenv/config";

// Now import other modules
import bcrypt from "bcryptjs";
import Stripe from "stripe";

import { ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { BillingPeriod, MembershipRole } from "@calcom/prisma/enums";

// Stripe product/price IDs from environment
const STRIPE_TEAM_MONTHLY_PRICE_ID = process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
const STRIPE_ORG_MONTHLY_PRICE_ID = process.env.STRIPE_ORG_MONTHLY_PRICE_ID;

// Fallback pricing constants (in cents) - used when Stripe price lookup fails
const TEAM_PRICE_PER_SEAT_CENTS_FALLBACK = 1500; // $15/seat/month
const ORG_PRICE_PER_SEAT_CENTS_FALLBACK = ORGANIZATION_SELF_SERVE_PRICE * 100; // $37/seat/month

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

const TEST_PASSWORD = "password123";
const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

// Test team (standalone, not in org)
const HWM_TEAM_SLUG = "hwm-test-team";
const HWM_TEAM_ADMIN_EMAIL = "hwm-team-admin@example.com";
const HWM_TEAM_MEMBER_EMAILS = Array.from({ length: 4 }, (_, i) => `hwm-team-member-${i + 1}@example.com`);

// Test organization
const HWM_ORG_SLUG = "hwm-test-org";
const HWM_ORG_ADMIN_EMAIL = "hwm-org-admin@example.com";
const HWM_ORG_MEMBER_EMAILS = Array.from({ length: 6 }, (_, i) => `hwm-org-member-${i + 1}@example.com`);

interface StripeResources {
  customer: Stripe.Customer | null;
  subscription: Stripe.Subscription | null;
  product: Stripe.Product | null;
  price: Stripe.Price | null;
  testClock: Stripe.TestHelpers.TestClock | null;
}

interface TeamSeedResult {
  team: { id: number; name: string; slug: string };
  memberCount: number;
  highWaterMark: number;
  paidSeats: number;
  stripe: StripeResources;
}

interface OrgSeedResult {
  organization: { id: number; name: string; slug: string };
  memberCount: number;
  highWaterMark: number;
  paidSeats: number;
  stripe: StripeResources;
}

interface SeedResult {
  team: TeamSeedResult;
  organization: OrgSeedResult;
  testUsers: Array<{ email: string; name: string; team: string }>;
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

  // Create a Profile for the user in the organization if organizationId is set
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

async function cleanupStripeResources(stripe: Stripe) {
  console.log("Cleaning up existing Stripe test resources...");

  // Clean up test clocks first (this will also delete associated customers/subscriptions)
  const testClocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
  for (const clock of testClocks.data) {
    if (clock.name?.startsWith("HWM Test")) {
      try {
        await stripe.testHelpers.testClocks.del(clock.id);
        console.log(`  Deleted test clock: ${clock.id} (${clock.name})`);
      } catch (error) {
        console.log(`  Could not delete test clock ${clock.id}:`, error);
      }
    }
  }

  // Clean up any customers not attached to test clocks
  const emailsToCleanup = [HWM_TEAM_ADMIN_EMAIL, HWM_ORG_ADMIN_EMAIL];
  for (const email of emailsToCleanup) {
    const customers = await stripe.customers.list({
      limit: 100,
      email,
    });

    for (const customer of customers.data) {
      try {
        // Cancel subscriptions first
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
        });
        for (const sub of subscriptions.data) {
          if (sub.status !== "canceled") {
            await stripe.subscriptions.cancel(sub.id);
            console.log(`  Cancelled subscription: ${sub.id}`);
          }
        }
        // Delete customer
        await stripe.customers.del(customer.id);
        console.log(`  Deleted customer: ${customer.id}`);
      } catch (error) {
        console.log(`  Could not delete customer ${customer.id}:`, error);
      }
    }
  }
}

async function createStripeResourcesForTeam(
  stripe: Stripe,
  teamId: number,
  email: string,
  name: string,
  seatCount: number,
  priceId: string
): Promise<StripeResources & { pricePerSeatCents: number }> {
  console.log(`Creating Stripe resources for ${name}...`);

  // Use existing price from env
  const price = await stripe.prices.retrieve(priceId);
  if (!price) {
    throw new Error(`Price not found: ${priceId}`);
  }
  const pricePerSeatCents = price.unit_amount || 0;
  console.log(`  Using existing price: ${price.id} ($${pricePerSeatCents / 100}/seat)`);

  // Get the product
  const product =
    typeof price.product === "string"
      ? await stripe.products.retrieve(price.product)
      : (price.product as Stripe.Product);
  console.log(`  Using existing product: ${product.id} (${product.name})`);

  // Create a test clock for time simulation
  const testClock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: `HWM Test - ${name}`,
  });
  console.log(`  Created test clock: ${testClock.id}`);

  // Create a customer attached to the test clock
  const customer = await stripe.customers.create({
    email,
    name,
    test_clock: testClock.id,
    metadata: {
      testData: "true",
      teamId: teamId.toString(),
      calTeamId: teamId.toString(),
    },
  });
  console.log(`  Created customer: ${customer.id} (attached to test clock)`);

  // Add a test payment method (test card)
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  });

  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });
  console.log(`  Attached payment method: ${paymentMethod.id}`);

  // Create a subscription with the specified seat count
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id, quantity: seatCount }],
    metadata: {
      testData: "true",
      teamId: teamId.toString(),
    },
  });
  console.log(`  Created subscription: ${subscription.id} (${seatCount} seats)`);

  return { customer, subscription, product, price, testClock, pricePerSeatCents };
}

async function cleanupDatabaseResources() {
  console.log("Cleaning up database test resources...");

  // Delete test users (cascade will handle related records)
  const testEmails = [HWM_TEAM_ADMIN_EMAIL, ...HWM_TEAM_MEMBER_EMAILS, HWM_ORG_ADMIN_EMAIL, ...HWM_ORG_MEMBER_EMAILS];
  const deleteResult = await prisma.user.deleteMany({
    where: { email: { in: testEmails } },
  });
  if (deleteResult.count > 0) {
    console.log(`  Deleted ${deleteResult.count} test users`);
  }

  // Clean up HWM test team
  const team = await prisma.team.findFirst({
    where: { slug: HWM_TEAM_SLUG, isOrganization: false },
  });

  if (team) {
    await prisma.seatChangeLog.deleteMany({ where: { teamId: team.id } });
    await prisma.teamBilling.deleteMany({ where: { teamId: team.id } });
    await prisma.membership.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    console.log(`  Deleted HWM test team (ID: ${team.id})`);
  }

  // Clean up HWM test org
  const org = await prisma.team.findFirst({
    where: { slug: HWM_ORG_SLUG, isOrganization: true },
  });

  if (org) {
    await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });
    await prisma.organizationBilling.deleteMany({ where: { teamId: org.id } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId: org.id } });

    // Delete child teams
    const childTeams = await prisma.team.findMany({ where: { parentId: org.id } });
    for (const t of childTeams) {
      await prisma.membership.deleteMany({ where: { teamId: t.id } });
      await prisma.team.delete({ where: { id: t.id } });
    }

    await prisma.membership.deleteMany({ where: { teamId: org.id } });
    await prisma.team.delete({ where: { id: org.id } });
    console.log(`  Deleted HWM test org (ID: ${org.id})`);
  }

  console.log("  Database cleanup complete");
}

async function seedHwmTeam(stripe: Stripe | null): Promise<TeamSeedResult> {
  console.log("\nCreating HWM test team (standalone)...");

  // Create team
  let team = await prisma.team.findFirst({
    where: { slug: HWM_TEAM_SLUG, isOrganization: false },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "HWM Test Team",
        slug: HWM_TEAM_SLUG,
        isOrganization: false,
      },
    });
  }
  console.log(`  Team created: ${team.name} (ID: ${team.id})`);

  // Create admin user
  const adminUser = await createTestUser(HWM_TEAM_ADMIN_EMAIL, "HWM Team Admin", "hwm-team-admin");

  // Create member users
  const members = [];
  for (let i = 0; i < HWM_TEAM_MEMBER_EMAILS.length; i++) {
    const user = await createTestUser(
      HWM_TEAM_MEMBER_EMAILS[i],
      `HWM Team Member ${i + 1}`,
      `hwm-team-member-${i + 1}`
    );
    members.push(user);
  }

  // Add admin to team as OWNER
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: team.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: team.id, role: MembershipRole.OWNER, accepted: true },
  });

  // Add 3 of 4 members to team (simulating current state after some churn)
  // This creates scenario: 4 members currently, but HWM will be 5 (peak was higher)
  for (let i = 0; i < 3; i++) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: members[i].id, teamId: team.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: members[i].id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  const currentMemberCount = 4; // 1 admin + 3 members
  const peakMemberCount = 5; // At some point had 5 members
  const paidSeats = currentMemberCount; // Subscription quantity matches current members

  console.log(`  Users added: ${currentMemberCount} current members (peak was ${peakMemberCount})`);

  // Stripe resources or fake IDs
  let stripeResources: StripeResources = {
    customer: null,
    subscription: null,
    product: null,
    price: null,
    testClock: null,
  };
  let stripeCustomerId = `cus_fake_hwm_team_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_hwm_team_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_hwm_team_${Date.now()}`;
  let teamPricePerSeatCents = TEAM_PRICE_PER_SEAT_CENTS_FALLBACK;

  if (stripe) {
    if (!STRIPE_TEAM_MONTHLY_PRICE_ID) {
      throw new Error("STRIPE_TEAM_MONTHLY_PRICE_ID is required when running with Stripe");
    }
    const result = await createStripeResourcesForTeam(
      stripe,
      team.id,
      HWM_TEAM_ADMIN_EMAIL,
      "HWM Test Team",
      paidSeats,
      STRIPE_TEAM_MONTHLY_PRICE_ID
    );
    stripeResources = result;
    stripeCustomerId = result.customer!.id;
    stripeSubscriptionId = result.subscription!.id;
    stripeSubscriptionItemId = result.subscription!.items.data[0].id;
    teamPricePerSeatCents = result.pricePerSeatCents;
  }

  // Monthly subscription dates
  const now = new Date();
  const subscriptionStart = new Date(now);
  subscriptionStart.setDate(1); // Start of current month
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

  // Create TeamBilling with MONTHLY billing and HWM tracking
  await prisma.teamBilling.upsert({
    where: { teamId: team.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: teamPricePerSeatCents,
      paidSeats,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
      highWaterMark: peakMemberCount,
      highWaterMarkPeriodStart: subscriptionStart,
    },
    create: {
      teamId: team.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "ACTIVE",
      planName: "TEAM",
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: teamPricePerSeatCents,
      paidSeats,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
      highWaterMark: peakMemberCount,
      highWaterMarkPeriodStart: subscriptionStart,
    },
  });

  console.log(`  TeamBilling created (MONTHLY, $${teamPricePerSeatCents / 100}/seat, ${paidSeats} paid, HWM=${peakMemberCount})`);

  // Get billing record for linking seat changes
  const teamBilling = await prisma.teamBilling.findUnique({ where: { teamId: team.id } });

  // Clear existing seat changes
  await prisma.seatChangeLog.deleteMany({ where: { teamId: team.id } });

  // Create seat change logs to simulate the history
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Initial additions (admin + 4 members = 5 peak)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  for (let i = 0; i < 5; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: team.id,
        changeType: "ADDITION",
        seatCount: 1,
        userId: i === 0 ? adminUser.id : members[Math.min(i - 1, members.length - 1)].id,
        triggeredBy: adminUser.id,
        changeDate: weekAgo,
        monthKey,
        teamBillingId: teamBilling?.id,
        metadata: { source: "seed-script", note: "Initial member addition" },
      },
    });
  }

  // One removal (member 4 left, bringing current count to 4)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  await prisma.seatChangeLog.create({
    data: {
      teamId: team.id,
      changeType: "REMOVAL",
      seatCount: 1,
      userId: members[3].id,
      triggeredBy: adminUser.id,
      changeDate: threeDaysAgo,
      monthKey,
      teamBillingId: teamBilling?.id,
      metadata: { source: "seed-script", note: "Member removed (HWM should stay at 5)" },
    },
  });

  console.log(`  SeatChangeLog entries created (5 additions, 1 removal)`);

  return {
    team: { id: team.id, name: team.name, slug: team.slug! },
    memberCount: currentMemberCount,
    highWaterMark: peakMemberCount,
    paidSeats,
    stripe: stripeResources,
  };
}

async function seedHwmOrg(stripe: Stripe | null): Promise<OrgSeedResult> {
  console.log("\nCreating HWM test organization...");

  // Create organization
  let org = await prisma.team.findFirst({
    where: { slug: HWM_ORG_SLUG, isOrganization: true },
  });

  if (!org) {
    org = await prisma.team.create({
      data: {
        name: "HWM Test Org",
        slug: HWM_ORG_SLUG,
        isOrganization: true,
      },
    });
  }
  console.log(`  Organization created: ${org.name} (ID: ${org.id})`);

  // Create OrganizationSettings
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

  // Create admin user
  const adminUser = await createTestUser(HWM_ORG_ADMIN_EMAIL, "HWM Org Admin", "hwm-org-admin", org.id);

  // Create member users
  const members = [];
  for (let i = 0; i < HWM_ORG_MEMBER_EMAILS.length; i++) {
    const user = await createTestUser(
      HWM_ORG_MEMBER_EMAILS[i],
      `HWM Org Member ${i + 1}`,
      `hwm-org-member-${i + 1}`,
      org.id
    );
    members.push(user);
  }

  // Add admin to org as OWNER
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
  });

  // Add 5 of 6 members to org (simulating current state)
  // Peak was 8 (admin + 7 members at one point), now at 6
  for (let i = 0; i < 5; i++) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: members[i].id, teamId: org.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: members[i].id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  const currentMemberCount = 6; // 1 admin + 5 members
  const peakMemberCount = 8; // At some point had 8 members
  const paidSeats = currentMemberCount; // Subscription quantity matches current members

  console.log(`  Users added: ${currentMemberCount} current members (peak was ${peakMemberCount})`);

  // Stripe resources or fake IDs
  let stripeResources: StripeResources = {
    customer: null,
    subscription: null,
    product: null,
    price: null,
    testClock: null,
  };
  let stripeCustomerId = `cus_fake_hwm_org_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_hwm_org_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_hwm_org_${Date.now()}`;
  let orgPricePerSeatCents = ORG_PRICE_PER_SEAT_CENTS_FALLBACK;

  if (stripe) {
    if (!STRIPE_ORG_MONTHLY_PRICE_ID) {
      throw new Error("STRIPE_ORG_MONTHLY_PRICE_ID is required when running with Stripe");
    }
    const result = await createStripeResourcesForTeam(
      stripe,
      org.id,
      HWM_ORG_ADMIN_EMAIL,
      "HWM Test Org",
      paidSeats,
      STRIPE_ORG_MONTHLY_PRICE_ID
    );
    stripeResources = result;
    stripeCustomerId = result.customer!.id;
    stripeSubscriptionId = result.subscription!.id;
    stripeSubscriptionItemId = result.subscription!.items.data[0].id;
    orgPricePerSeatCents = result.pricePerSeatCents;
  }

  // Monthly subscription dates
  const now = new Date();
  const subscriptionStart = new Date(now);
  subscriptionStart.setDate(1);
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

  // Create OrganizationBilling with MONTHLY billing and HWM tracking
  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: orgPricePerSeatCents,
      paidSeats,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
      highWaterMark: peakMemberCount,
      highWaterMarkPeriodStart: subscriptionStart,
    },
    create: {
      teamId: org.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "ACTIVE",
      planName: "ORGANIZATION",
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: orgPricePerSeatCents,
      paidSeats,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
      highWaterMark: peakMemberCount,
      highWaterMarkPeriodStart: subscriptionStart,
    },
  });

  // Set team metadata
  await prisma.team.update({
    where: { id: org.id },
    data: {
      metadata: {
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
      },
    },
  });

  console.log(`  OrganizationBilling created (MONTHLY, $${orgPricePerSeatCents / 100}/seat, ${paidSeats} paid, HWM=${peakMemberCount})`);

  // Get billing record for linking seat changes
  const orgBilling = await prisma.organizationBilling.findUnique({ where: { teamId: org.id } });

  // Clear existing seat changes
  await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });

  // Create seat change logs to simulate the history
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Initial additions (admin + 7 members = 8 peak)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  for (let i = 0; i < 8; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: org.id,
        changeType: "ADDITION",
        seatCount: 1,
        userId: i === 0 ? adminUser.id : members[Math.min(i - 1, members.length - 1)].id,
        triggeredBy: adminUser.id,
        changeDate: twoWeeksAgo,
        monthKey,
        organizationBillingId: orgBilling?.id,
        metadata: { source: "seed-script", note: "Initial member addition" },
      },
    });
  }

  // Two removals (bringing current count from 8 to 6)
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  for (let i = 0; i < 2; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: org.id,
        changeType: "REMOVAL",
        seatCount: 1,
        userId: members[5].id, // Last member
        triggeredBy: adminUser.id,
        changeDate: fiveDaysAgo,
        monthKey,
        organizationBillingId: orgBilling?.id,
        metadata: { source: "seed-script", note: "Member removed (HWM should stay at 8)" },
      },
    });
  }

  console.log(`  SeatChangeLog entries created (8 additions, 2 removals)`);

  return {
    organization: { id: org.id, name: org.name, slug: org.slug! },
    memberCount: currentMemberCount,
    highWaterMark: peakMemberCount,
    paidSeats,
    stripe: stripeResources,
  };
}

async function seedHwmTest(): Promise<SeedResult> {
  const stripe = getStripeClient();

  // Enable the hwm-seating feature flag
  await prisma.feature.upsert({
    where: { slug: "hwm-seating" },
    update: { enabled: true },
    create: {
      slug: "hwm-seating",
      enabled: true,
      description: "High water mark seating for monthly billing",
      type: "RELEASE",
      stale: false,
    },
  });
  console.log("Enabled hwm-seating feature flag");

  if (CLEANUP_FIRST) {
    await cleanupDatabaseResources();
    if (stripe) {
      await cleanupStripeResources(stripe);
    }
  }

  const teamResult = await seedHwmTeam(stripe);
  const orgResult = await seedHwmOrg(stripe);

  const testUsers = [
    { email: HWM_TEAM_ADMIN_EMAIL, name: "HWM Team Admin", team: "hwm-test-team" },
    ...HWM_TEAM_MEMBER_EMAILS.slice(0, 3).map((email, i) => ({
      email,
      name: `HWM Team Member ${i + 1}`,
      team: "hwm-test-team",
    })),
    { email: HWM_ORG_ADMIN_EMAIL, name: "HWM Org Admin", team: "hwm-test-org" },
    ...HWM_ORG_MEMBER_EMAILS.slice(0, 5).map((email, i) => ({
      email,
      name: `HWM Org Member ${i + 1}`,
      team: "hwm-test-org",
    })),
  ];

  return {
    team: teamResult,
    organization: orgResult,
    testUsers,
  };
}

async function main() {
  console.log("=== High Water Mark (HWM) Test Seed Script ===\n");
  console.log("Options:");
  console.log(`  --skip-stripe: ${SKIP_STRIPE}`);
  console.log(`  --cleanup: ${CLEANUP_FIRST}`);
  console.log("");

  try {
    const result = await seedHwmTest();

    console.log("\n=== Seed Complete ===\n");

    // Summary table
    const teamSubUrl = result.team.stripe.subscription
      ? `https://dashboard.stripe.com/test/subscriptions/${result.team.stripe.subscription.id}`
      : "N/A (--skip-stripe)";
    const teamCustUrl = result.team.stripe.customer
      ? `https://dashboard.stripe.com/test/customers/${result.team.stripe.customer.id}`
      : "N/A";
    const teamClockUrl = result.team.stripe.testClock
      ? `https://dashboard.stripe.com/test/test-clocks/${result.team.stripe.testClock.id}`
      : "N/A";
    const orgSubUrl = result.organization.stripe.subscription
      ? `https://dashboard.stripe.com/test/subscriptions/${result.organization.stripe.subscription.id}`
      : "N/A (--skip-stripe)";
    const orgCustUrl = result.organization.stripe.customer
      ? `https://dashboard.stripe.com/test/customers/${result.organization.stripe.customer.id}`
      : "N/A";
    const orgClockUrl = result.organization.stripe.testClock
      ? `https://dashboard.stripe.com/test/test-clocks/${result.organization.stripe.testClock.id}`
      : "N/A";

    // Calculate test clock dates from subscription period end
    const teamPeriodEnd = result.team.stripe.subscription?.current_period_end
      ? new Date(result.team.stripe.subscription.current_period_end * 1000)
      : null;
    const orgPeriodEnd = result.organization.stripe.subscription?.current_period_end
      ? new Date(result.organization.stripe.subscription.current_period_end * 1000)
      : null;

    // invoice.upcoming fires ~3 days before period end
    const teamInvoiceUpcomingDate = teamPeriodEnd
      ? new Date(teamPeriodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      : null;
    const orgInvoiceUpcomingDate = orgPeriodEnd
      ? new Date(orgPeriodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      : null;

    const formatDate = (d: Date | null) => (d ? d.toISOString().split("T")[0] : "N/A");

    console.log("=== Summary Table ===\n");
    console.log(
      "| Entity | Qty | Members | HWM | invoice.upcoming | After Renewal | Price |"
    );
    console.log(
      "|--------|-----|---------|-----|------------------|---------------|-------|"
    );
    console.log(
      `| Team (ID:${result.team.team.id}) | ${result.team.paidSeats} | ${result.team.memberCount} | ${result.team.highWaterMark} | qty → ${result.team.highWaterMark} | qty → ${result.team.memberCount} (scale down) | $6.99 |`
    );
    console.log(
      `| Org (ID:${result.organization.organization.id}) | ${result.organization.paidSeats} | ${result.organization.memberCount} | ${result.organization.highWaterMark} | qty → ${result.organization.highWaterMark} | qty → ${result.organization.memberCount} (scale down) | $37 |`
    );

    console.log("\n=== Test Clock Dates ===\n");
    console.log(`  1. Advance to ${formatDate(teamInvoiceUpcomingDate)} → triggers invoice.upcoming (scale UP to HWM)`);
    console.log(`  2. Advance to ${formatDate(teamPeriodEnd)} → triggers renewal (scale DOWN to current members)`);

    console.log("\n=== Stripe Resources ===\n");
    console.log("Team:");
    console.log(`  Subscription: ${teamSubUrl}`);
    console.log(`  Customer:     ${teamCustUrl}`);
    console.log(`  Test Clock:   ${teamClockUrl}`);
    console.log("\nOrg:");
    console.log(`  Subscription: ${orgSubUrl}`);
    console.log(`  Customer:     ${orgCustUrl}`);
    console.log(`  Test Clock:   ${orgClockUrl}`);

    // Test users
    console.log("\n=== Test Users ===");
    console.log(`Total test users created: ${result.testUsers.length}`);
    console.log("User credentials are defined in the seed script constants.");

    console.log("\n=== Testing Instructions ===\n");
    console.log("1. ADVANCE TEST CLOCK to trigger invoice.upcoming:");
    console.log("   Go to the Test Clock URL above and click 'Advance time'");
    console.log("   Advance to ~3 days before the billing period ends (e.g., +27 days)");
    console.log("   This will trigger the invoice.upcoming webhook");
    console.log("");
    console.log("   Or use Stripe CLI:");
    if (result.team.stripe.testClock) {
      const advanceTime = Math.floor(Date.now() / 1000) + 27 * 24 * 60 * 60;
      console.log(`   stripe test_clocks advance ${result.team.stripe.testClock.id} --frozen-time ${advanceTime}`);
    }
    console.log("");
    console.log("2. invoice.upcoming webhook flow:");
    console.log("   - Stripe sends invoice.upcoming ~3 days before renewal");
    console.log("   - The webhook calls HighWaterMarkService.applyHighWaterMarkToSubscription()");
    console.log("   - This updates the subscription quantity to the HWM value");
    console.log("   - Team: subscription quantity updated from 4 to 5");
    console.log("   - Org: subscription quantity updated from 6 to 8");
    console.log("");
    console.log("3. ADVANCE TEST CLOCK again to trigger renewal:");
    console.log("   Advance to after the billing period ends (e.g., +31 days from start)");
    console.log("   This will trigger customer.subscription.updated webhook");
    console.log("");
    console.log("4. customer.subscription.updated webhook flow:");
    console.log("   - After renewal completes, this webhook fires");
    console.log("   - For MONTHLY billing, it calls resetSubscriptionAfterRenewal()");
    console.log("   - This resets subscription quantity AND HWM to current member count");
    console.log("   - Team: subscription quantity reset from 5 to 4, HWM reset to 4");
    console.log("   - Org: subscription quantity reset from 8 to 6, HWM reset to 6");
    console.log("");
    console.log("5. To verify HWM in database:");
    console.log(`   SELECT "highWaterMark", "highWaterMarkPeriodStart", "paidSeats" FROM "TeamBilling" WHERE "teamId" = ${result.team.team.id};`);
    console.log(`   SELECT "highWaterMark", "highWaterMarkPeriodStart", "paidSeats" FROM "OrganizationBilling" WHERE "teamId" = ${result.organization.organization.id};`);
    console.log("");

    console.log("=== Cleanup ===\n");
    console.log("To clean up all test data, run:");
    console.log(
      "  npx tsx packages/features/ee/billing/service/highWaterMark/seed-hwm-test.ts --cleanup --skip-stripe"
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
