#!/usr/bin/env npx tsx
/**
 * Seed script for testing Active User billing
 *
 * This script creates:
 * 1. An organization with 100 members (admin + 99 members)
 * 2. Bookings so that 30 members are "active" (hosted or attended a booking)
 * 3. Stripe customer + subscription with billingMode = ACTIVE_USERS
 * 4. The active-user-billing feature flag
 *
 * After seeding it runs the ActiveUserBillingService to count active users
 * and prints a comparison between created vs counted.
 *
 * Prerequisites:
 *   - DATABASE_URL must be set (or .env loaded)
 *   - STRIPE_PRIVATE_KEY for real Stripe resources (optional)
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/active-user/seed-active-user-test.ts
 *
 * Options:
 *   --skip-stripe    Skip Stripe API calls (use fake IDs)
 *   --cleanup        Clean up test data before seeding
 */

import "dotenv/config";

import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import Stripe from "stripe";

import { ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { BillingMode, BillingPeriod, BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import { ActiveUserBillingRepository } from "./repositories/ActiveUserBillingRepository";
import { ActiveUserBillingService } from "./services/ActiveUserBillingService";

const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

const TOTAL_MEMBERS = 99;
const ACTIVE_HOSTS = 20;
const ACTIVE_ATTENDEES_ONLY = 10;
const TOTAL_ACTIVE = ACTIVE_HOSTS + ACTIVE_ATTENDEES_ONLY; // 30

const ORG_SLUG = "aub-test-org";
const ORG_ADMIN_EMAIL = "aub-org-admin@example.com";
const ORG_MEMBER_EMAILS = Array.from({ length: TOTAL_MEMBERS }, (_, i) => `aub-org-member-${i + 1}@example.com`);

const ALL_EMAILS = [ORG_ADMIN_EMAIL, ...ORG_MEMBER_EMAILS];

const ORG_PRICE_PER_SEAT_CENTS = ORGANIZATION_SELF_SERVE_PRICE * 100;

const STRIPE_ORG_MONTHLY_PRICE_ID = process.env.STRIPE_ORG_MONTHLY_PRICE_ID;

let hashedPasswordCache: string | null = null;
async function getHashedPassword(): Promise<string> {
  if (!hashedPasswordCache) {
    const salt = await bcrypt.genSalt(10);
    hashedPasswordCache = await bcrypt.hash("password123", salt);
  }
  return hashedPasswordCache;
}

async function createTestUser(
  email: string,
  name: string,
  username: string,
  organizationId?: number
) {
  const hashedPassword = await getHashedPassword();

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

  if (organizationId) {
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
  }

  return user;
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
  return new Stripe(process.env.STRIPE_PRIVATE_KEY, { apiVersion: "2020-08-27" });
}

async function cleanupStripeResources(stripe: Stripe) {
  console.log("Cleaning up Stripe resources...");
  const testClocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
  for (const clock of testClocks.data) {
    if (clock.name?.startsWith("AUB Test")) {
      try {
        await stripe.testHelpers.testClocks.del(clock.id);
        console.log(`  Deleted test clock: ${clock.id}`);
      } catch {
        // ignore
      }
    }
  }

  const customers = await stripe.customers.list({ limit: 100, email: ORG_ADMIN_EMAIL });
  for (const customer of customers.data) {
    try {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all" });
      for (const sub of subs.data) {
        if (sub.status !== "canceled") await stripe.subscriptions.cancel(sub.id);
      }
      await stripe.customers.del(customer.id);
      console.log(`  Deleted customer: ${customer.id}`);
    } catch {
      // ignore
    }
  }
}

async function cleanupDatabaseResources() {
  console.log("Cleaning up database resources...");

  const org = await prisma.team.findFirst({ where: { slug: ORG_SLUG, isOrganization: true } });

  if (org) {
    const memberUsers = await prisma.user.findMany({
      where: { email: { in: ALL_EMAILS } },
      select: { id: true },
    });
    const memberIds = memberUsers.map((u) => u.id);

    if (memberIds.length > 0) {
      const bookings = await prisma.booking.findMany({
        where: { userId: { in: memberIds } },
        select: { id: true },
      });
      const bookingIds = bookings.map((b) => b.id);
      if (bookingIds.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
        console.log(`  Deleted ${bookingIds.length} bookings`);
      }
    }

    await prisma.organizationBilling.deleteMany({ where: { teamId: org.id } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId: org.id } });
    await prisma.membership.deleteMany({ where: { teamId: org.id } });
    await prisma.team.delete({ where: { id: org.id } });
    console.log(`  Deleted org (ID: ${org.id})`);
  }

  const deleteResult = await prisma.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });
  if (deleteResult.count > 0) console.log(`  Deleted ${deleteResult.count} users`);

  console.log("  Database cleanup complete");
}

interface UserRecord {
  id: number;
  email: string;
  name: string | null;
}

interface SeedResult {
  orgId: number;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  totalMembers: number;
  expectedActiveHosts: string[];
  expectedActiveAttendees: string[];
  expectedInactive: string[];
}

async function seed(): Promise<SeedResult> {
  const stripe = getStripeClient();

  // Enable feature flag
  await prisma.feature.upsert({
    where: { slug: "active-user-billing" },
    update: { enabled: true },
    create: {
      slug: "active-user-billing",
      enabled: true,
      description: "Active user billing strategy",
      type: "RELEASE",
      stale: false,
    },
  });
  console.log("Enabled active-user-billing feature flag");

  if (CLEANUP_FIRST) {
    await cleanupDatabaseResources();
    if (stripe) await cleanupStripeResources(stripe);
  }

  // Create organization
  console.log("\nCreating organization...");
  let org = await prisma.team.findFirst({ where: { slug: ORG_SLUG, isOrganization: true } });
  if (!org) {
    org = await prisma.team.create({
      data: { name: "AUB Test Org", slug: ORG_SLUG, isOrganization: true },
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

  // Create users (admin + 99 members = 100 total)
  console.log(`Creating ${TOTAL_MEMBERS + 1} users...`);
  const admin = await createTestUser(ORG_ADMIN_EMAIL, "AUB Org Admin", "aub-org-admin", org.id);
  const members: UserRecord[] = [];
  for (let i = 0; i < TOTAL_MEMBERS; i++) {
    const user = await createTestUser(
      ORG_MEMBER_EMAILS[i],
      `AUB Member ${i + 1}`,
      `aub-org-member-${i + 1}`,
      org.id
    );
    members.push(user);
    if ((i + 1) % 25 === 0) console.log(`  ... created ${i + 1}/${TOTAL_MEMBERS} members`);
  }
  console.log(`  Created admin + ${members.length} members = ${members.length + 1} total`);

  // Add memberships
  console.log("Adding memberships...");
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: admin.id, teamId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: admin.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
  });
  for (const member of members) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: member.id, teamId: org.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: member.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  // Billing period: defaults to current calendar month, overridden by Stripe below
  const now = new Date();
  let periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  let periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  // Stripe setup (before bookings so we know the actual billing period)
  let stripeCustomerId = `cus_fake_aub_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_aub_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_aub_${Date.now()}`;
  let pricePerSeatCents = ORG_PRICE_PER_SEAT_CENTS;

  if (stripe) {
    if (!STRIPE_ORG_MONTHLY_PRICE_ID) {
      throw new Error("STRIPE_ORG_MONTHLY_PRICE_ID is required when running with Stripe");
    }

    console.log("\nCreating Stripe resources...");
    const price = await stripe.prices.retrieve(STRIPE_ORG_MONTHLY_PRICE_ID);
    pricePerSeatCents = price.unit_amount || ORG_PRICE_PER_SEAT_CENTS;
    const product =
      typeof price.product === "string"
        ? await stripe.products.retrieve(price.product)
        : (price.product as Stripe.Product);

    const testClock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: "AUB Test - Active User Billing",
    });
    console.log(`  Test clock: ${testClock.id}`);

    const customer = await stripe.customers.create({
      email: ORG_ADMIN_EMAIL,
      name: "AUB Test Org",
      test_clock: testClock.id,
      metadata: { testData: "true", calTeamId: org.id.toString() },
    });

    const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
    await stripe.paymentMethods.attach(pm.id, { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: pm.id },
    });

    const totalMembers = 1 + members.length;
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id, quantity: totalMembers }],
      metadata: { testData: "true", teamId: org.id.toString() },
    });

    stripeCustomerId = customer.id;
    stripeSubscriptionId = subscription.id;
    stripeSubscriptionItemId = subscription.items.data[0].id;

    // Use Stripe's actual billing period so bookings align with what Stripe bills for
    periodStart = new Date(subscription.current_period_start * 1000);
    periodEnd = new Date(subscription.current_period_end * 1000);

    console.log(`  Customer: ${customer.id}`);
    console.log(`  Subscription: ${subscription.id} (${totalMembers} seats)`);
    console.log(`  Product: ${product.id} (${product.name})`);
    console.log(`  Stripe period: ${periodStart.toISOString()} - ${periodEnd.toISOString()}`);
    console.log(
      `  Test clock URL: https://dashboard.stripe.com/test/test-clocks/${testClock.id}`
    );
  }

  // Create bookings within the billing period to produce exactly 30 active users:
  //
  //   Admin          -> hosts 2 bookings in period             (ACTIVE as host)   [1]
  //   Members 1-19   -> each hosts 1 booking in period         (ACTIVE as host)   [19]
  //   Members 20-29  -> each attends one of the host bookings  (ACTIVE as attendee only) [10]
  //   Member 30      -> hosts 1 booking OUTSIDE period         (INACTIVE - out of range)
  //   Members 31-99  -> no bookings                            (INACTIVE)
  //
  // Total active = 1 admin host + 19 member hosts + 10 attendees = 30
  // Total inactive = 1 out-of-range host + 69 idle = 70

  console.log(`Creating bookings in period ${periodStart.toISOString()} - ${periodEnd.toISOString()}...`);
  const bookingIds: number[] = [];

  async function createBooking(
    host: UserRecord,
    startTime: Date,
    endTime: Date,
    attendeeEmail?: string
  ) {
    const booking = await prisma.booking.create({
      data: {
        uid: randomUUID(),
        title: `Booking by ${host.name}`,
        startTime,
        endTime,
        userId: host.id,
        status: BookingStatus.ACCEPTED,
      },
    });
    bookingIds.push(booking.id);

    if (attendeeEmail) {
      await prisma.attendee.create({
        data: {
          email: attendeeEmail,
          name: "Attendee",
          timeZone: "UTC",
          bookingId: booking.id,
        },
      });
    }
    return booking.id;
  }

  const inPeriod = (dayOffset: number) => {
    const d = new Date(periodStart);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    return d;
  };
  const hourLater = (d: Date) => new Date(d.getTime() + 60 * 60 * 1000);

  // Admin hosts 2 bookings (shows multiple bookings still = 1 active user)
  await createBooking(admin, inPeriod(1), hourLater(inPeriod(1)));
  await createBooking(admin, inPeriod(2), hourLater(inPeriod(2)));

  // Members 1-19 each host 1 booking
  // Members 20-29 are attendees on those bookings (paired with members 1-10)
  for (let i = 0; i < ACTIVE_HOSTS - 1; i++) {
    const host = members[i];
    const day = inPeriod(3 + i);
    const attendeeEmail =
      i < ACTIVE_ATTENDEES_ONLY ? members[ACTIVE_HOSTS - 1 + i].email : undefined;
    await createBooking(host, day, hourLater(day), attendeeEmail);
  }

  // Member 30 (index 29) hosts a booking OUTSIDE the period (last month)
  const outsidePeriod = new Date(periodStart);
  outsidePeriod.setUTCMonth(outsidePeriod.getUTCMonth() - 1);
  outsidePeriod.setUTCDate(15);
  await createBooking(members[29], outsidePeriod, hourLater(outsidePeriod));

  console.log(`  Created ${bookingIds.length} bookings`);

  // Build expected lists
  const expectedActiveHosts = [
    admin.email,
    ...members.slice(0, ACTIVE_HOSTS - 1).map((m) => m.email),
  ];
  const expectedActiveAttendees = members
    .slice(ACTIVE_HOSTS - 1, ACTIVE_HOSTS - 1 + ACTIVE_ATTENDEES_ONLY)
    .map((m) => m.email);
  const expectedInactive = members.slice(ACTIVE_HOSTS - 1 + ACTIVE_ATTENDEES_ONLY).map((m) => m.email);

  // Create OrganizationBilling with ACTIVE_USERS mode
  const totalMembers = 1 + members.length;
  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.MONTHLY,
      billingMode: BillingMode.ACTIVE_USERS,
      pricePerSeat: pricePerSeatCents,
      paidSeats: totalMembers,
      subscriptionStart: periodStart,
      subscriptionEnd: periodEnd,
      subscriptionTrialEnd: null,
    },
    create: {
      teamId: org.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "ACTIVE",
      planName: "ORGANIZATION",
      billingPeriod: BillingPeriod.MONTHLY,
      billingMode: BillingMode.ACTIVE_USERS,
      pricePerSeat: pricePerSeatCents,
      paidSeats: totalMembers,
      subscriptionStart: periodStart,
      subscriptionEnd: periodEnd,
      subscriptionTrialEnd: null,
    },
  });

  await prisma.team.update({
    where: { id: org.id },
    data: {
      metadata: {
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
      },
    },
  });

  console.log(
    `\n  OrganizationBilling created (MONTHLY, billingMode=ACTIVE_USERS, $${pricePerSeatCents / 100}/seat, ${totalMembers} paid seats)`
  );

  return {
    orgId: org.id,
    subscriptionId: stripeSubscriptionId,
    periodStart,
    periodEnd,
    totalMembers,
    expectedActiveHosts,
    expectedActiveAttendees,
    expectedInactive,
  };
}

async function main() {
  console.log("=== Active User Billing (AUB) Seed Script ===\n");
  console.log("Options:");
  console.log(`  --skip-stripe: ${SKIP_STRIPE}`);
  console.log(`  --cleanup: ${CLEANUP_FIRST}`);
  console.log("");

  try {
    const result = await seed();

    // Run the service to count active users
    console.log("\n--- Running ActiveUserBillingService ---\n");
    const repo = new ActiveUserBillingRepository(prisma);
    const service = new ActiveUserBillingService({ activeUserBillingRepository: repo });

    const serviceCount = await service.getActiveUserCountForOrg(
      result.orgId,
      result.periodStart,
      result.periodEnd
    );

    const expectedTotal =
      result.expectedActiveHosts.length + result.expectedActiveAttendees.length;

    // Print summary
    console.log("=== Summary ===\n");
    console.log(`  Organization ID:    ${result.orgId}`);
    console.log(`  Subscription ID:    ${result.subscriptionId}`);
    console.log(
      `  Billing period:     ${result.periodStart.toISOString()} - ${result.periodEnd.toISOString()}`
    );
    console.log(`  Total members:      ${result.totalMembers}`);
    console.log("");

    console.log(`  Active hosts (${result.expectedActiveHosts.length}):`);
    for (const email of result.expectedActiveHosts) {
      console.log(`    - ${email}`);
    }

    console.log(`  Active attendees only (${result.expectedActiveAttendees.length}):`);
    for (const email of result.expectedActiveAttendees) {
      console.log(`    - ${email}`);
    }

    console.log(`  Inactive (${result.expectedInactive.length}):`);
    console.log(`    (${result.expectedInactive.length} members with no in-period bookings)`);

    console.log("");
    console.log("  +--------------------------+---------+");
    console.log("  | Category                 | Count   |");
    console.log("  +--------------------------+---------+");
    console.log(`  | Total org members        | ${String(result.totalMembers).padStart(7)} |`);
    console.log(`  | Active hosts (created)   | ${String(result.expectedActiveHosts.length).padStart(7)} |`);
    console.log(`  | Active attendees (created)| ${String(result.expectedActiveAttendees.length).padStart(6)} |`);
    console.log(`  | Total active (created)   | ${String(expectedTotal).padStart(7)} |`);
    console.log(`  | Inactive (created)       | ${String(result.expectedInactive.length).padStart(7)} |`);
    console.log(`  | Service counted          | ${String(serviceCount).padStart(7)} |`);
    console.log("  +--------------------------+---------+");

    if (serviceCount === expectedTotal) {
      console.log("\n  [PASS] Service count matches expected count.");
    } else {
      console.log(
        `\n  [MISMATCH] Expected ${expectedTotal}, service returned ${serviceCount}.`
      );
    }

    console.log("\n=== Done ===\n");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
