#!/usr/bin/env npx tsx
/**
 * Seed script for testing Dunning Enforcement
 *
 * Creates 5 separate organizations, each at a different dunning tier:
 *   - dunning-healthy-org       (CURRENT)      - no dunning, control case
 *   - dunning-warning-org       (WARNING)      - payment just failed
 *   - dunning-soft-blocked-org  (SOFT_BLOCKED) - 8 days overdue
 *   - dunning-hard-blocked-org  (HARD_BLOCKED) - 15 days overdue
 *   - dunning-cancelled-org     (CANCELLED)    - 91 days overdue
 *
 * Each org has its own Stripe customer/subscription, OrganizationBilling,
 * and TeamDunningStatus record. Billing is per-org so each org operates
 * independently for dunning enforcement testing.
 *
 * Prerequisites:
 *   - STRIPE_PRIVATE_KEY must be set (use test mode key)
 *   - STRIPE_ORG_MONTHLY_PRICE_ID must be set
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/dunning/seed-dunning-test.ts
 *
 * Options:
 *   --skip-stripe       Skip Stripe API calls (use fake IDs)
 *   --trigger-emails    Fire dunning email Trigger.dev tasks after seeding
 *   --cleanup           Clean up test data before seeding
 */

import "dotenv/config";

import process from "node:process";
import { ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { BillingPeriod, MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { CANCEL_DAYS, HARD_BLOCK_DAYS, SOFT_BLOCK_DAYS } from "./BaseDunningService";

const STRIPE_ORG_MONTHLY_PRICE_ID = process.env.STRIPE_ORG_MONTHLY_PRICE_ID;

const ORG_PRICE_PER_SEAT_CENTS_FALLBACK = ORGANIZATION_SELF_SERVE_PRICE * 100;

const TEST_PASSWORD = "password123";
const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const TRIGGER_EMAILS = process.argv.includes("--trigger-emails");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Config per dunning tier ---

interface DunningOrgConfig {
  slug: string;
  name: string;
  status: "CURRENT" | "WARNING" | "SOFT_BLOCKED" | "HARD_BLOCKED" | "CANCELLED";
  firstFailedDaysAgo: number | null;
  adminEmail: string;
  memberEmails: string[];
}

const DUNNING_ORGS: DunningOrgConfig[] = [
  {
    slug: "dunning-healthy-org",
    name: "Dunning Healthy Org",
    status: "CURRENT",
    firstFailedDaysAgo: null,
    adminEmail: "dunning-healthy-admin@example.com",
    memberEmails: Array.from({ length: 3 }, (_, i) => `dunning-healthy-member-${i + 1}@example.com`),
  },
  {
    slug: "dunning-warning-org",
    name: "Dunning Warning Org",
    status: "WARNING",
    firstFailedDaysAgo: 0,
    adminEmail: "dunning-warning-admin@example.com",
    memberEmails: Array.from({ length: 3 }, (_, i) => `dunning-warning-member-${i + 1}@example.com`),
  },
  {
    slug: "dunning-soft-blocked-org",
    name: "Dunning Soft Blocked Org",
    status: "SOFT_BLOCKED",
    firstFailedDaysAgo: SOFT_BLOCK_DAYS + 1,
    adminEmail: "dunning-soft-blocked-admin@example.com",
    memberEmails: Array.from({ length: 3 }, (_, i) => `dunning-soft-blocked-member-${i + 1}@example.com`),
  },
  {
    slug: "dunning-hard-blocked-org",
    name: "Dunning Hard Blocked Org",
    status: "HARD_BLOCKED",
    firstFailedDaysAgo: HARD_BLOCK_DAYS + 1,
    adminEmail: "dunning-hard-blocked-admin@example.com",
    memberEmails: Array.from({ length: 3 }, (_, i) => `dunning-hard-blocked-member-${i + 1}@example.com`),
  },
  {
    slug: "dunning-cancelled-org",
    name: "Dunning Cancelled Org",
    status: "CANCELLED",
    firstFailedDaysAgo: CANCEL_DAYS + 1,
    adminEmail: "dunning-cancelled-admin@example.com",
    memberEmails: Array.from({ length: 3 }, (_, i) => `dunning-cancelled-member-${i + 1}@example.com`),
  },
];

// --- Types ---

interface StripeResources {
  customer: Stripe.Customer | null;
  subscription: Stripe.Subscription | null;
  testClock: Stripe.TestHelpers.TestClock | null;
  invoiceId: string | null;
  invoiceUrl: string | null;
}

interface OrgSeedResult {
  org: { id: number; name: string; slug: string };
  status: string;
  firstFailedDaysAgo: number | null;
  adminEmail: string;
  memberCount: number;
  stripe: StripeResources;
}

// --- Helpers ---

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

async function createTestUser(email: string, name: string, username: string, organizationId: number) {
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

// --- Stripe ---

async function createStripeResources(
  stripe: Stripe,
  orgId: number,
  email: string,
  name: string,
  seatCount: number,
  priceId: string,
  isDunning: boolean,
  firstFailedDaysAgo: number | null
): Promise<StripeResources & { pricePerSeatCents: number }> {
  console.log(`  Creating Stripe resources...`);

  const price = await stripe.prices.retrieve(priceId);
  if (!price) throw new Error(`Price not found: ${priceId}`);
  const pricePerSeatCents = price.unit_amount || 0;
  console.log(`    Price: ${price.id} ($${pricePerSeatCents / 100}/seat)`);

  // Freeze the test clock in the past so the invoice due date is realistic.
  // For a HARD_BLOCKED org (15 days overdue), the clock is frozen 15 days ago,
  // so the invoice + days_until_due puts the due date ~14 days in the past.
  const clockFrozenAt = isDunning && firstFailedDaysAgo
    ? Math.floor((Date.now() - firstFailedDaysAgo * MS_PER_DAY) / 1000)
    : Math.floor(Date.now() / 1000);

  const testClock = await stripe.testHelpers.testClocks.create({
    frozen_time: clockFrozenAt,
    name: `Dunning Test - ${name}`,
  });
  console.log(`    Test clock: ${testClock.id} (frozen ${isDunning && firstFailedDaysAgo ? `${firstFailedDaysAgo} days ago` : "at now"})`);

  const customer = await stripe.customers.create({
    email,
    name,
    test_clock: testClock.id,
    metadata: { testData: "true", calTeamId: orgId.toString() },
  });
  console.log(`    Customer: ${customer.id}`);

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  });
  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  // For dunning orgs, use send_invoice so the invoice stays open (unpaid)
  // instead of charge_automatically which auto-pays with tok_visa
  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customer.id,
    items: [{ price: price.id, quantity: seatCount }],
    metadata: { testData: "true", calTeamId: orgId.toString() },
  };
  if (isDunning) {
    subscriptionParams.collection_method = "send_invoice";
    subscriptionParams.days_until_due = 1;
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);
  console.log(`    Subscription: ${subscription.id} (${seatCount} seats, collection: ${isDunning ? "send_invoice" : "charge_automatically"})`);

  let invoiceId: string | null = null;
  let invoiceUrl: string | null = null;
  const invoices = await stripe.invoices.list({ subscription: subscription.id, limit: 1 });
  if (invoices.data.length > 0) {
    let invoice = invoices.data[0];
    // Finalize draft invoices so they become "open" with a hosted_invoice_url
    if (isDunning && invoice.status === "draft") {
      invoice = await stripe.invoices.finalizeInvoice(invoice.id);
    }
    invoiceId = invoice.id;
    invoiceUrl = invoice.hosted_invoice_url || null;
    console.log(`    Invoice: ${invoiceId} (status: ${invoice.status})`);
  }

  return { customer, subscription, testClock, invoiceId, invoiceUrl, pricePerSeatCents };
}

async function cleanupStripeResources(stripe: Stripe) {
  console.log("Cleaning up Stripe test resources...");

  const testClocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
  for (const clock of testClocks.data) {
    if (clock.name?.startsWith("Dunning Test")) {
      try {
        await stripe.testHelpers.testClocks.del(clock.id);
        console.log(`  Deleted test clock: ${clock.id} (${clock.name})`);
      } catch (error) {
        console.log(`  Could not delete test clock ${clock.id}:`, error);
      }
    }
  }

  for (const config of DUNNING_ORGS) {
    const customers = await stripe.customers.list({ limit: 10, email: config.adminEmail });
    for (const customer of customers.data) {
      try {
        const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all" });
        for (const sub of subs.data) {
          if (sub.status !== "canceled") {
            await stripe.subscriptions.cancel(sub.id);
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

// --- Database Cleanup ---

async function cleanupDatabaseResources() {
  console.log("Cleaning up database test resources...");

  const allEmails = DUNNING_ORGS.flatMap((c) => [c.adminEmail, ...c.memberEmails]);
  const deleteResult = await prisma.user.deleteMany({ where: { email: { in: allEmails } } });
  if (deleteResult.count > 0) {
    console.log(`  Deleted ${deleteResult.count} test users`);
  }

  for (const config of DUNNING_ORGS) {
    const org = await prisma.team.findFirst({
      where: { slug: config.slug, isOrganization: true },
      select: { id: true },
    });
    if (!org) continue;

    // Delete child teams first
    const childTeams = await prisma.team.findMany({
      where: { parentId: org.id },
      select: { id: true, slug: true },
    });
    for (const t of childTeams) {
      await prisma.host.deleteMany({ where: { eventType: { teamId: t.id } } });
      await prisma.eventType.deleteMany({ where: { teamId: t.id } });
      await prisma.teamDunningStatus.deleteMany({
        where: { teamBilling: { teamId: t.id } },
      });
      await prisma.teamBilling.deleteMany({ where: { teamId: t.id } });
      await prisma.membership.deleteMany({ where: { teamId: t.id } });
      await prisma.team.delete({ where: { id: t.id } });
    }

    await prisma.organizationDunningStatus.deleteMany({
      where: { organizationBilling: { teamId: org.id } },
    });
    await prisma.organizationBilling.deleteMany({ where: { teamId: org.id } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId: org.id } });
    await prisma.membership.deleteMany({ where: { teamId: org.id } });
    await prisma.team.delete({ where: { id: org.id } });
    console.log(`  Deleted org: ${config.slug} (ID: ${org.id})`);
  }

  console.log("  Database cleanup complete");
}

// --- Seed a single org ---

async function seedOrg(config: DunningOrgConfig, stripe: Stripe | null): Promise<OrgSeedResult> {
  console.log(`\nCreating org: ${config.name} (${config.status})...`);

  let org = await prisma.team.findFirst({
    where: { slug: config.slug, isOrganization: true },
    select: { id: true, name: true, slug: true },
  });

  if (!org) {
    org = await prisma.team.create({
      data: {
        name: config.name,
        slug: config.slug,
        isOrganization: true,
      },
      select: { id: true, name: true, slug: true },
    });
  }
  console.log(`  Org created: ${org.name} (ID: ${org.id})`);

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

  // Create admin
  const adminUsername = `${config.slug.replace("-org", "")}-admin`;
  const adminUser = await createTestUser(config.adminEmail, `${config.name} Admin`, adminUsername, org.id);
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
  });

  // Create members
  const members = [];
  for (let i = 0; i < config.memberEmails.length; i++) {
    const memberUsername = `${config.slug.replace("-org", "")}-member-${i + 1}`;
    const user = await createTestUser(
      config.memberEmails[i],
      `${config.name} Member ${i + 1}`,
      memberUsername,
      org.id
    );
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: org.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: user.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    });
    members.push(user);
  }

  const seatCount = 1 + members.length;
  console.log(`  Users: ${seatCount} (1 admin + ${members.length} members)`);

  // Child team for event types (orgs don't surface event types directly in the UI)
  const childTeamSlug = config.slug.replace("-org", "-team");
  const childTeam = await prisma.team.upsert({
    where: { slug_parentId: { slug: childTeamSlug, parentId: org.id } },
    update: {},
    create: {
      name: `${config.name} Team`,
      slug: childTeamSlug,
      parentId: org.id,
    },
    select: { id: true, slug: true },
  });

  // Add admin + members to child team
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: childTeam.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: childTeam.id, role: MembershipRole.OWNER, accepted: true },
  });
  for (const member of members) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: member.id, teamId: childTeam.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: member.id, teamId: childTeam.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  // Event types on the child team for booking tests
  const eventType30 = await prisma.eventType.upsert({
    where: {
      teamId_slug: { teamId: childTeam.id, slug: "30-min" },
    },
    update: {},
    create: {
      title: `${config.name} 30 min`,
      slug: "30-min",
      length: 30,
      teamId: childTeam.id,
      schedulingType: SchedulingType.ROUND_ROBIN,
    },
    select: { id: true },
  });
  await prisma.host.upsert({
    where: { userId_eventTypeId: { userId: adminUser.id, eventTypeId: eventType30.id } },
    update: {},
    create: { userId: adminUser.id, eventTypeId: eventType30.id, isFixed: false },
  });

  const eventType60 = await prisma.eventType.upsert({
    where: {
      teamId_slug: { teamId: childTeam.id, slug: "60-min" },
    },
    update: {},
    create: {
      title: `${config.name} 60 min`,
      slug: "60-min",
      length: 60,
      teamId: childTeam.id,
      schedulingType: SchedulingType.ROUND_ROBIN,
    },
    select: { id: true },
  });
  await prisma.host.upsert({
    where: { userId_eventTypeId: { userId: adminUser.id, eventTypeId: eventType60.id } },
    update: {},
    create: { userId: adminUser.id, eventTypeId: eventType60.id, isFixed: false },
  });
  console.log(`  Child team: ${childTeamSlug} (ID: ${childTeam.id}) with event types: 30-min, 60-min`);

  // Stripe resources
  let stripeResources: StripeResources = {
    customer: null,
    subscription: null,
    testClock: null,
    invoiceId: null,
    invoiceUrl: null,
  };
  let stripeCustomerId = `cus_fake_${config.slug}_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_${config.slug}_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_${config.slug}_${Date.now()}`;
  let pricePerSeatCents = ORG_PRICE_PER_SEAT_CENTS_FALLBACK;

  if (stripe) {
    if (!STRIPE_ORG_MONTHLY_PRICE_ID) {
      throw new Error("STRIPE_ORG_MONTHLY_PRICE_ID is required when running with Stripe");
    }
    const result = await createStripeResources(
      stripe,
      org.id,
      config.adminEmail,
      config.name,
      seatCount,
      STRIPE_ORG_MONTHLY_PRICE_ID,
      config.status !== "CURRENT",
      config.firstFailedDaysAgo
    );
    stripeResources = result;
    stripeCustomerId = result.customer?.id ?? stripeCustomerId;
    stripeSubscriptionId = result.subscription?.id ?? stripeSubscriptionId;
    stripeSubscriptionItemId = result.subscription?.items.data[0].id ?? stripeSubscriptionItemId;
    pricePerSeatCents = result.pricePerSeatCents;
  }

  // OrganizationBilling
  const now = new Date();
  const subscriptionStart = new Date(now);
  subscriptionStart.setDate(1);
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.MONTHLY,
      pricePerSeat: pricePerSeatCents,
      paidSeats: seatCount,
      subscriptionStart,
      subscriptionEnd,
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
      pricePerSeat: pricePerSeatCents,
      paidSeats: seatCount,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
    },
  });
  console.log(`  OrganizationBilling created ($${pricePerSeatCents / 100}/seat, ${seatCount} paid)`);

  // Set subscriptionId in team metadata so the org upgrade banner check is satisfied.
  // checkIfOrgNeedsUpgrade.handler.ts looks at team.metadata.subscriptionId to determine
  // if the org has been fully set up (not in trial/needs-upgrade state).
  await prisma.team.update({
    where: { id: org.id },
    data: {
      metadata: {
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
      },
    },
  });
  console.log("  Team metadata updated with subscriptionId");

  // OrganizationDunningStatus (skip for CURRENT)
  if (config.status !== "CURRENT" && config.firstFailedDaysAgo !== null) {
    const firstFailedAt = new Date(now.getTime() - config.firstFailedDaysAgo * MS_PER_DAY);

    const orgBilling = await prisma.organizationBilling.findUniqueOrThrow({
      where: { teamId: org.id },
      select: { id: true },
    });

    await prisma.organizationDunningStatus.upsert({
      where: { organizationBillingId: orgBilling.id },
      update: {
        status: config.status,
        firstFailedAt,
        lastFailedAt: now,
        resolvedAt: null,
        subscriptionId: stripeSubscriptionId,
        failedInvoiceId: stripeResources.invoiceId || `in_fake_${config.slug}_${Date.now()}`,
        invoiceUrl: stripeResources.invoiceUrl || `https://invoice.stripe.com/fake/${config.slug}`,
        failureReason: "Your card was declined.",
      },
      create: {
        organizationBillingId: orgBilling.id,
        status: config.status,
        firstFailedAt,
        lastFailedAt: now,
        resolvedAt: null,
        subscriptionId: stripeSubscriptionId,
        failedInvoiceId: stripeResources.invoiceId || `in_fake_${config.slug}_${Date.now()}`,
        invoiceUrl: stripeResources.invoiceUrl || `https://invoice.stripe.com/fake/${config.slug}`,
        failureReason: "Your card was declined.",
      },
    });
    console.log(
      `  OrganizationDunningStatus: ${config.status} (firstFailedAt: ${config.firstFailedDaysAgo} days ago)`
    );
  }

  return {
    org: { id: org.id, name: org.name, slug: org.slug ?? config.slug },
    status: config.status,
    firstFailedDaysAgo: config.firstFailedDaysAgo,
    adminEmail: config.adminEmail,
    memberCount: seatCount,
    stripe: stripeResources,
  };
}

// --- Trigger emails ---

async function triggerDunningEmails(results: OrgSeedResult[]) {
  console.log("\nTriggering dunning email tasks...");

  const { sendDunningWarningEmail } = await import("./trigger/send-dunning-warning-email");
  const { sendDunningPauseEmail } = await import("./trigger/send-dunning-pause-email");
  const { sendDunningCancellationEmail } = await import("./trigger/send-dunning-cancellation-email");

  for (const r of results) {
    if (r.status === "WARNING") {
      await sendDunningWarningEmail.trigger({ teamId: r.org.id });
      console.log(`  Triggered warning email for ${r.org.slug} (ID: ${r.org.id})`);
    }
    if (r.status === "HARD_BLOCKED") {
      await sendDunningPauseEmail.trigger({ teamId: r.org.id });
      console.log(`  Triggered pause email for ${r.org.slug} (ID: ${r.org.id})`);
    }
    if (r.status === "CANCELLED") {
      await sendDunningCancellationEmail.trigger({ teamId: r.org.id });
      console.log(`  Triggered cancellation email for ${r.org.slug} (ID: ${r.org.id})`);
    }
  }
}

// --- Summary helpers ---

function getBlockedActions(status: string): string {
  switch (status) {
    case "CURRENT":
      return "None";
    case "WARNING":
      return "Banner only";
    case "SOFT_BLOCKED":
      return "INVITE, CREATE_EVENT_TYPE";
    case "HARD_BLOCKED":
      return "INVITE, EVENT_TYPE, BOOKING, API";
    case "CANCELLED":
      return "All actions blocked";
    default:
      return "Unknown";
  }
}

// --- Main ---

async function main() {
  console.log("=== Dunning Enforcement Seed Script ===\n");
  console.log("Options:");
  console.log(`  --skip-stripe:    ${SKIP_STRIPE}`);
  console.log(`  --trigger-emails: ${TRIGGER_EMAILS}`);
  console.log(`  --cleanup:        ${CLEANUP_FIRST}`);
  console.log("");

  try {
    const stripe = getStripeClient();

    await prisma.feature.upsert({
      where: { slug: "dunning-enforcement" },
      update: { enabled: true },
      create: {
        slug: "dunning-enforcement",
        enabled: true,
        description: "Dunning enforcement for failed subscription payments",
        type: "OPERATIONAL",
        stale: false,
      },
    });
    console.log("Enabled dunning-enforcement feature flag");

    if (CLEANUP_FIRST) {
      await cleanupDatabaseResources();
      if (stripe) {
        await cleanupStripeResources(stripe);
      }
    }

    const results: OrgSeedResult[] = [];
    for (const config of DUNNING_ORGS) {
      const result = await seedOrg(config, stripe);
      results.push(result);
    }

    if (TRIGGER_EMAILS) {
      await triggerDunningEmails(results);
    }

    // --- Summary ---
    console.log("\n=== Seed Complete ===\n");

    console.log(
      "| Org Slug                    | ID   | Status        | Blocked Actions                | Admin Login                              |"
    );
    console.log(
      "|-----------------------------|------|---------------|--------------------------------|------------------------------------------|"
    );
    for (const r of results) {
      const slug = r.org.slug.padEnd(27);
      const id = String(r.org.id).padEnd(4);
      const status = r.status.padEnd(13);
      const blocked = getBlockedActions(r.status).padEnd(30);
      const login = r.adminEmail.padEnd(40);
      console.log(`| ${slug} | ${id} | ${status} | ${blocked} | ${login} |`);
    }

    console.log(`\nPassword for all users: ${TEST_PASSWORD}`);

    if (stripe) {
      console.log("\n=== Stripe Resources ===\n");
      for (const r of results) {
        if (!r.stripe.customer) continue;
        console.log(`${r.org.slug} (${r.status}):`);
        console.log(`  Customer:     https://dashboard.stripe.com/test/customers/${r.stripe.customer.id}`);
        if (r.stripe.subscription) {
          console.log(
            `  Subscription: https://dashboard.stripe.com/test/subscriptions/${r.stripe.subscription.id}`
          );
        }
        if (r.stripe.testClock) {
          console.log(
            `  Test Clock:   https://dashboard.stripe.com/test/test-clocks/${r.stripe.testClock.id}`
          );
        }
        console.log("");
      }
    }

    console.log("=== Dunning Tier Thresholds ===\n");
    console.log(`  WARNING:      Immediate (day 0)`);
    console.log(`  SOFT_BLOCKED: After ${SOFT_BLOCK_DAYS} days`);
    console.log(`  HARD_BLOCKED: After ${HARD_BLOCK_DAYS} days`);
    console.log(`  CANCELLED:    After ${CANCEL_DAYS} days`);

    console.log("\n=== Testing Instructions ===\n");
    console.log("1. Log in as any org admin to see the dunning banner for that org");
    console.log("2. Each org has independent billing - test enforcement per org");
    console.log("3. SOFT_BLOCKED: try inviting a member or creating an event type (should fail)");
    console.log("4. HARD_BLOCKED: try creating a booking (should also fail)");
    console.log("5. CANCELLED: all actions should be blocked");

    console.log("\n=== Cleanup ===\n");
    console.log(
      "  npx tsx packages/features/ee/billing/service/dunning/seed-dunning-test.ts --cleanup --skip-stripe"
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
