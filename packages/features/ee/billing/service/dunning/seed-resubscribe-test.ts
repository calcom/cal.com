#!/usr/bin/env npx tsx
/**
 * Seed script for testing the Resubscribe flow
 *
 * Creates two test cases for cancelled subscriptions that need resubscription:
 *   1. resub-team       - A standalone team with cancelled subscription
 *   2. resub-org        - An organization with cancelled subscription
 *
 * Each entity has:
 *   - A billing record with CANCELLED-era data (old subscriptionId preserved)
 *   - A dunning status record at CANCELLED
 *   - Team metadata wiped (simulates what downgrade() does on cancel)
 *   - An admin user who can trigger the resubscribe flow
 *   - Member users to verify seat count is carried over
 *
 * Prerequisites:
 *   - STRIPE_PRIVATE_KEY must be set (use test mode key)
 *   - STRIPE_TEAM_MONTHLY_PRICE_ID must be set (for team case)
 *   - STRIPE_ORG_MONTHLY_PRICE_ID must be set (for org case)
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/dunning/seed-resubscribe-test.ts
 *
 * Options:
 *   --skip-stripe       Skip Stripe API calls (use fake IDs)
 *   --cleanup           Clean up test data before seeding
 */

import "dotenv/config";

import process from "node:process";
import { prisma } from "@calcom/prisma";
import { BillingPeriod, MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { CANCEL_DAYS } from "./BaseDunningService";

const TEST_PASSWORD = "password123";
const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TEAM_PRICE_CENTS_FALLBACK = 1200; // $12/seat
const ORG_PRICE_CENTS_FALLBACK = 3700; // $37/seat

// --- Config ---

interface ResubTestConfig {
  slug: string;
  name: string;
  isOrganization: boolean;
  adminEmail: string;
  memberEmails: string[];
  stripePriceEnvVar: string;
  priceFallbackCents: number;
}

const TEST_CASES: ResubTestConfig[] = [
  {
    slug: "resub-team",
    name: "Resub Team",
    isOrganization: false,
    adminEmail: "resub-team-admin@example.com",
    memberEmails: [
      "resub-team-member-1@example.com",
      "resub-team-member-2@example.com",
    ],
    stripePriceEnvVar: "STRIPE_TEAM_MONTHLY_PRICE_ID",
    priceFallbackCents: TEAM_PRICE_CENTS_FALLBACK,
  },
  {
    slug: "resub-org",
    name: "Resub Org",
    isOrganization: true,
    adminEmail: "resub-org-admin@example.com",
    memberEmails: [
      "resub-org-member-1@example.com",
      "resub-org-member-2@example.com",
      "resub-org-member-3@example.com",
    ],
    stripePriceEnvVar: "STRIPE_ORG_MONTHLY_PRICE_ID",
    priceFallbackCents: ORG_PRICE_CENTS_FALLBACK,
  },
];

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

async function createTestUser(
  email: string,
  name: string,
  username: string,
  organizationId: number | null
) {
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
      ...(organizationId ? { organizationId } : {}),
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

// --- Stripe ---

async function createCancelledStripeSubscription(
  stripe: Stripe,
  config: ResubTestConfig,
  entityId: number,
  seatCount: number
): Promise<{
  customerId: string;
  subscriptionId: string;
  subscriptionItemId: string;
  pricePerSeatCents: number;
}> {
  const priceId = process.env[config.stripePriceEnvVar];
  if (!priceId) {
    throw new Error(`Missing env var: ${config.stripePriceEnvVar}`);
  }

  console.log("  Creating Stripe resources (will cancel subscription)...");

  const price = await stripe.prices.retrieve(priceId);
  const pricePerSeatCents = price.unit_amount || config.priceFallbackCents;

  const customer = await stripe.customers.create({
    email: config.adminEmail,
    name: config.name,
    metadata: { testData: "true", calTeamId: entityId.toString() },
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

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId, quantity: seatCount }],
    metadata: { testData: "true", calTeamId: entityId.toString() },
  });
  const subscriptionItemId = subscription.items.data[0].id;
  console.log(`    Subscription: ${subscription.id} (${seatCount} seats)`);

  // Cancel the subscription to simulate the cancelled state
  await stripe.subscriptions.cancel(subscription.id);
  console.log(`    Subscription cancelled (simulating dunning cancellation)`);

  return {
    customerId: customer.id,
    subscriptionId: subscription.id,
    subscriptionItemId,
    pricePerSeatCents,
  };
}

// --- Database Cleanup ---

async function cleanupDatabaseResources() {
  console.log("Cleaning up database test resources...");

  const allEmails = TEST_CASES.flatMap((c) => [c.adminEmail, ...c.memberEmails]);
  const deleteResult = await prisma.user.deleteMany({ where: { email: { in: allEmails } } });
  if (deleteResult.count > 0) {
    console.log(`  Deleted ${deleteResult.count} test users`);
  }

  for (const config of TEST_CASES) {
    const entity = await prisma.team.findFirst({
      where: { slug: config.slug, isOrganization: config.isOrganization },
      select: { id: true },
    });
    if (!entity) continue;

    if (config.isOrganization) {
      // Clean child teams
      const childTeams = await prisma.team.findMany({
        where: { parentId: entity.id },
        select: { id: true },
      });
      for (const t of childTeams) {
        await prisma.host.deleteMany({ where: { eventType: { teamId: t.id } } });
        await prisma.eventType.deleteMany({ where: { teamId: t.id } });
        await prisma.membership.deleteMany({ where: { teamId: t.id } });
        await prisma.team.delete({ where: { id: t.id } });
      }
      await prisma.organizationDunningStatus.deleteMany({
        where: { organizationBilling: { teamId: entity.id } },
      });
      await prisma.organizationBilling.deleteMany({ where: { teamId: entity.id } });
      await prisma.organizationSettings.deleteMany({ where: { organizationId: entity.id } });
    } else {
      await prisma.host.deleteMany({ where: { eventType: { teamId: entity.id } } });
      await prisma.eventType.deleteMany({ where: { teamId: entity.id } });
      await prisma.teamDunningStatus.deleteMany({
        where: { teamBilling: { teamId: entity.id } },
      });
      await prisma.teamBilling.deleteMany({ where: { teamId: entity.id } });
    }

    await prisma.membership.deleteMany({ where: { teamId: entity.id } });
    await prisma.team.delete({ where: { id: entity.id } });
    console.log(`  Deleted ${config.isOrganization ? "org" : "team"}: ${config.slug} (ID: ${entity.id})`);
  }

  console.log("  Database cleanup complete");
}

async function cleanupStripeResources(stripe: Stripe) {
  console.log("Cleaning up Stripe test resources...");

  for (const config of TEST_CASES) {
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

// --- Seed a single test case ---

async function seedTestCase(config: ResubTestConfig, stripe: Stripe | null) {
  const label = config.isOrganization ? "org" : "team";
  console.log(`\nCreating ${label}: ${config.name} (CANCELLED - needs resubscribe)...`);

  // Create the team/org
  let entity = await prisma.team.findFirst({
    where: { slug: config.slug, isOrganization: config.isOrganization },
    select: { id: true, name: true, slug: true },
  });

  if (!entity) {
    entity = await prisma.team.create({
      data: {
        name: config.name,
        slug: config.slug,
        isOrganization: config.isOrganization,
        // Wiped metadata - simulates what downgrade() does on cancel
        metadata: {},
      },
      select: { id: true, name: true, slug: true },
    });
  } else {
    // Wipe metadata to simulate cancelled state
    await prisma.team.update({
      where: { id: entity.id },
      data: { metadata: {} },
    });
  }
  console.log(`  ${label} created: ${entity.name} (ID: ${entity.id})`);

  // Org settings (only for org case)
  if (config.isOrganization) {
    await prisma.organizationSettings.upsert({
      where: { organizationId: entity.id },
      update: {},
      create: {
        organizationId: entity.id,
        orgAutoAcceptEmail: "example.com",
        isOrganizationConfigured: true,
        isOrganizationVerified: true,
      },
    });
  }

  // Create admin
  const adminUsername = `${config.slug}-admin`;
  const orgId = config.isOrganization ? entity.id : null;
  const adminUser = await createTestUser(config.adminEmail, `${config.name} Admin`, adminUsername, orgId);
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: entity.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: entity.id, role: MembershipRole.OWNER, accepted: true },
  });

  // Create members
  const members = [];
  for (let i = 0; i < config.memberEmails.length; i++) {
    const memberUsername = `${config.slug}-member-${i + 1}`;
    const user = await createTestUser(
      config.memberEmails[i],
      `${config.name} Member ${i + 1}`,
      memberUsername,
      orgId
    );
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: entity.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: user.id, teamId: entity.id, role: MembershipRole.MEMBER, accepted: true },
    });
    members.push(user);
  }

  const seatCount = 1 + members.length;
  console.log(`  Users: ${seatCount} (1 admin + ${members.length} members)`);

  // Event types - for team directly, for org on a child team
  let eventTypeTeamId = entity.id;
  if (config.isOrganization) {
    const childTeamSlug = `${config.slug}-child-team`;
    const childTeam = await prisma.team.upsert({
      where: { slug_parentId: { slug: childTeamSlug, parentId: entity.id } },
      update: {},
      create: {
        name: `${config.name} Child Team`,
        slug: childTeamSlug,
        parentId: entity.id,
      },
      select: { id: true },
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

    eventTypeTeamId = childTeam.id;
    console.log(`  Child team: ${childTeamSlug} (ID: ${childTeam.id})`);
  }

  const eventType = await prisma.eventType.upsert({
    where: { teamId_slug: { teamId: eventTypeTeamId, slug: "30-min" } },
    update: {},
    create: {
      title: `${config.name} 30 min`,
      slug: "30-min",
      length: 30,
      teamId: eventTypeTeamId,
      schedulingType: SchedulingType.ROUND_ROBIN,
    },
    select: { id: true },
  });
  await prisma.host.upsert({
    where: { userId_eventTypeId: { userId: adminUser.id, eventTypeId: eventType.id } },
    update: {},
    create: { userId: adminUser.id, eventTypeId: eventType.id, isFixed: false },
  });

  // Stripe resources
  let stripeCustomerId = `cus_fake_${config.slug}_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_${config.slug}_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_${config.slug}_${Date.now()}`;
  let pricePerSeatCents = config.priceFallbackCents;

  if (stripe) {
    const result = await createCancelledStripeSubscription(stripe, config, entity.id, seatCount);
    stripeCustomerId = result.customerId;
    stripeSubscriptionId = result.subscriptionId;
    stripeSubscriptionItemId = result.subscriptionItemId;
    pricePerSeatCents = result.pricePerSeatCents;
  }

  // Create billing record with old (cancelled) subscription data
  const now = new Date();
  const subscriptionStart = new Date(now);
  subscriptionStart.setDate(1);
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
  const firstFailedAt = new Date(now.getTime() - (CANCEL_DAYS + 1) * MS_PER_DAY);

  if (config.isOrganization) {
    await prisma.organizationBilling.upsert({
      where: { teamId: entity.id },
      update: {
        customerId: stripeCustomerId,
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
        billingPeriod: BillingPeriod.MONTHLY,
        pricePerSeat: pricePerSeatCents,
        paidSeats: seatCount,
      },
      create: {
        teamId: entity.id,
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
      },
    });

    const orgBilling = await prisma.organizationBilling.findUniqueOrThrow({
      where: { teamId: entity.id },
      select: { id: true },
    });

    await prisma.organizationDunningStatus.upsert({
      where: { organizationBillingId: orgBilling.id },
      update: {
        status: "CANCELLED",
        firstFailedAt,
        lastFailedAt: now,
        resolvedAt: null,
        subscriptionId: stripeSubscriptionId,
        failedInvoiceId: `in_fake_${config.slug}_${Date.now()}`,
        invoiceUrl: null,
        failureReason: "Your card was declined.",
      },
      create: {
        organizationBillingId: orgBilling.id,
        status: "CANCELLED",
        firstFailedAt,
        lastFailedAt: now,
        subscriptionId: stripeSubscriptionId,
        failedInvoiceId: `in_fake_${config.slug}_${Date.now()}`,
        invoiceUrl: null,
        failureReason: "Your card was declined.",
      },
    });

    console.log(`  OrganizationBilling + OrganizationDunningStatus (CANCELLED) created`);
  } else {
    await prisma.teamBilling.upsert({
      where: { teamId: entity.id },
      update: {
        customerId: stripeCustomerId,
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
        billingPeriod: BillingPeriod.MONTHLY,
        pricePerSeat: pricePerSeatCents,
        paidSeats: seatCount,
      },
      create: {
        teamId: entity.id,
        customerId: stripeCustomerId,
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
        status: "ACTIVE",
        planName: "TEAM",
        billingPeriod: BillingPeriod.MONTHLY,
        pricePerSeat: pricePerSeatCents,
        paidSeats: seatCount,
        subscriptionStart,
        subscriptionEnd,
      },
    });

    const teamBilling = await prisma.teamBilling.findUniqueOrThrow({
      where: { teamId: entity.id },
      select: { id: true },
    });

    await prisma.teamDunningStatus.upsert({
      where: { teamBillingId: teamBilling.id },
      update: {
        status: "CANCELLED",
        firstFailedAt,
        lastFailedAt: now,
        resolvedAt: null,
        subscriptionId: stripeSubscriptionId,
        failedInvoiceId: `in_fake_${config.slug}_${Date.now()}`,
        invoiceUrl: null,
        failureReason: "Your card was declined.",
      },
      create: {
        teamBillingId: teamBilling.id,
        status: "CANCELLED",
        firstFailedAt,
        lastFailedAt: now,
        subscriptionId: stripeSubscriptionId,
        failedInvoiceId: `in_fake_${config.slug}_${Date.now()}`,
        invoiceUrl: null,
        failureReason: "Your card was declined.",
      },
    });

    console.log(`  TeamBilling + TeamDunningStatus (CANCELLED) created`);
  }

  console.log(`  Metadata wiped (no subscriptionId/subscriptionItemId)`);
  console.log(`  Price: $${pricePerSeatCents / 100}/seat, ${seatCount} seats`);

  return {
    id: entity.id,
    slug: entity.slug ?? config.slug,
    name: config.name,
    type: label,
    adminEmail: config.adminEmail,
    seatCount,
    pricePerSeatCents,
    stripeCustomerId,
    stripeSubscriptionId,
  };
}

// --- Main ---

async function main() {
  console.log("=== Resubscribe Seed Script ===\n");
  console.log("Options:");
  console.log(`  --skip-stripe: ${SKIP_STRIPE}`);
  console.log(`  --cleanup:     ${CLEANUP_FIRST}`);
  console.log("");

  try {
    const stripe = getStripeClient();

    // Ensure dunning feature flag is on
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

    const results = [];
    for (const config of TEST_CASES) {
      const result = await seedTestCase(config, stripe);
      results.push(result);
    }

    // --- Summary ---
    console.log("\n=== Seed Complete ===\n");

    console.log("| Type | Slug        | ID   | Seats | Price/Seat | Admin Login                    |");
    console.log("|------|-------------|------|-------|------------|--------------------------------|");
    for (const r of results) {
      const type = r.type.padEnd(4);
      const slug = r.slug.padEnd(11);
      const id = String(r.id).padEnd(4);
      const seats = String(r.seatCount).padEnd(5);
      const price = `$${(r.pricePerSeatCents / 100).toFixed(2)}`.padEnd(10);
      const login = r.adminEmail.padEnd(30);
      console.log(`| ${type} | ${slug} | ${id} | ${seats} | ${price} | ${login} |`);
    }

    console.log(`\nPassword for all users: ${TEST_PASSWORD}`);

    if (stripe) {
      console.log("\n=== Stripe Resources ===\n");
      for (const r of results) {
        console.log(`${r.slug} (${r.type}):`);
        console.log(`  Customer:     https://dashboard.stripe.com/test/customers/${r.stripeCustomerId}`);
        console.log(`  Subscription: https://dashboard.stripe.com/test/subscriptions/${r.stripeSubscriptionId} (CANCELLED)`);
        console.log("");
      }
    }

    console.log("=== Testing Instructions ===\n");
    console.log("1. Log in as the team admin (resub-team-admin@example.com) or org admin (resub-org-admin@example.com)");
    console.log("2. You should see the dunning banner with a 'Resubscribe' button (not 'Pay Now')");
    console.log("3. Click 'Resubscribe' - it should create a Stripe Checkout session mirroring the old subscription");
    console.log("4. Complete checkout - the billing record should be replaced and metadata updated");
    console.log("5. The dunning banner should disappear after successful resubscription");

    console.log("\n=== Cleanup ===\n");
    console.log(
      "  npx tsx packages/features/ee/billing/service/dunning/seed-resubscribe-test.ts --cleanup --skip-stripe"
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
