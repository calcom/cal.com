#!/usr/bin/env npx tsx
/**
 * Seed script for testing the Recreate Ownership flow
 *
 * Simulates the scenario where a team owner deleted their account, which
 * caused the Stripe subscription to be cancelled/deleted. The team is left
 * with members but no owner and no active subscription.
 *
 * Creates:
 *   1. recreate-team  - A standalone team with no owner, only members
 *   2. recreate-org   - An organization with no owner, only members
 *
 * Each entity has:
 *   - A billing record with a cancelled/deleted subscription
 *   - NO dunning record (the admin tool will create one with CANCELLED status)
 *   - NO owner membership (the original owner "deleted their account")
 *   - Member users who can be promoted via the admin tool
 *
 * Testing:
 *   1. Log in as a Cal.com admin
 *   2. Go to Admin > Billing, look up the customer ID printed by this script
 *   3. The "Transfer Ownership" button should detect no owners and show "Recreate Ownership" mode
 *   4. Select a member to promote — preview should show CANCELLED dunning state
 *   5. Confirm — the member becomes OWNER and dunning record is created as CANCELLED
 *   6. Log in as the new owner — they should see a "Resubscribe" banner
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/dunning/seed-recreate-ownership-test.ts
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

const TEST_PASSWORD = "password123";
const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

const TEAM_PRICE_CENTS_FALLBACK = 1200; // $12/seat

interface RecreateTestConfig {
  slug: string;
  name: string;
  isOrganization: boolean;
  deletedOwnerEmail: string;
  memberEmails: string[];
  stripePriceEnvVar: string;
  priceFallbackCents: number;
}

const TEST_CASES: RecreateTestConfig[] = [
  {
    slug: "recreate-team",
    name: "Recreate Team",
    isOrganization: false,
    deletedOwnerEmail: "recreate-team-deleted-owner@example.com",
    memberEmails: [
      "recreate-team-member-1@example.com",
      "recreate-team-member-2@example.com",
      "recreate-team-member-3@example.com",
    ],
    stripePriceEnvVar: "STRIPE_TEAM_MONTHLY_PRICE_ID",
    priceFallbackCents: TEAM_PRICE_CENTS_FALLBACK,
  },
  {
    slug: "recreate-org",
    name: "Recreate Org",
    isOrganization: true,
    deletedOwnerEmail: "recreate-org-deleted-owner@example.com",
    memberEmails: [
      "recreate-org-member-1@example.com",
      "recreate-org-member-2@example.com",
    ],
    stripePriceEnvVar: "STRIPE_ORG_MONTHLY_PRICE_ID",
    priceFallbackCents: 3700,
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

async function createDeletedStripeCustomer(
  stripe: Stripe,
  config: RecreateTestConfig,
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

  console.log("  Creating Stripe resources (will cancel subscription to simulate deleted owner)...");

  const price = await stripe.prices.retrieve(priceId);
  const pricePerSeatCents = price.unit_amount || config.priceFallbackCents;

  const customer = await stripe.customers.create({
    email: config.deletedOwnerEmail,
    name: `${config.name} (deleted owner)`,
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

  // Cancel the subscription to simulate what happens when owner deletes account
  await stripe.subscriptions.cancel(subscription.id);
  console.log(`    Subscription cancelled (simulating owner account deletion)`);

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

  const allEmails = TEST_CASES.flatMap((c) => [c.deletedOwnerEmail, ...c.memberEmails]);
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
    const customers = await stripe.customers.list({ limit: 10, email: config.deletedOwnerEmail });
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

async function seedTestCase(config: RecreateTestConfig, stripe: Stripe | null) {
  const label = config.isOrganization ? "org" : "team";
  console.log(`\nCreating ${label}: ${config.name} (owner deleted — no owner, no subscription)...`);

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
        metadata: {},
      },
      select: { id: true, name: true, slug: true },
    });
  } else {
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

  const orgId = config.isOrganization ? entity.id : null;

  // Create members only — NO owner (simulating deleted owner)
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

  // The original owner had the team + members, so seat count was 1 (owner) + members
  const originalSeatCount = 1 + members.length;
  console.log(`  Members: ${members.length} (owner was deleted, no OWNER membership exists)`);

  // Event types
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

  await prisma.eventType.upsert({
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

  // Stripe resources
  let stripeCustomerId = `cus_fake_${config.slug}_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_${config.slug}_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_${config.slug}_${Date.now()}`;
  let pricePerSeatCents = config.priceFallbackCents;

  if (stripe) {
    const result = await createDeletedStripeCustomer(stripe, config, entity.id, originalSeatCount);
    stripeCustomerId = result.customerId;
    stripeSubscriptionId = result.subscriptionId;
    stripeSubscriptionItemId = result.subscriptionItemId;
    pricePerSeatCents = result.pricePerSeatCents;
  }

  // Create billing record — subscription is cancelled but record remains
  const now = new Date();
  const subscriptionStart = new Date(now);
  subscriptionStart.setDate(1);
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

  let billingId: string;

  if (config.isOrganization) {
    await prisma.organizationBilling.upsert({
      where: { teamId: entity.id },
      update: {
        customerId: stripeCustomerId,
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
        billingPeriod: BillingPeriod.MONTHLY,
        pricePerSeat: pricePerSeatCents,
        paidSeats: originalSeatCount,
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
        paidSeats: originalSeatCount,
        subscriptionStart,
        subscriptionEnd,
      },
    });

    const orgBilling = await prisma.organizationBilling.findUniqueOrThrow({
      where: { teamId: entity.id },
      select: { id: true },
    });
    billingId = orgBilling.id;

    // No dunning record — the admin tool will create one
    await prisma.organizationDunningStatus.deleteMany({
      where: { organizationBillingId: orgBilling.id },
    });

    console.log(`  OrganizationBilling created (no dunning record — admin tool will create it)`);
  } else {
    await prisma.teamBilling.upsert({
      where: { teamId: entity.id },
      update: {
        customerId: stripeCustomerId,
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
        billingPeriod: BillingPeriod.MONTHLY,
        pricePerSeat: pricePerSeatCents,
        paidSeats: originalSeatCount,
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
        paidSeats: originalSeatCount,
        subscriptionStart,
        subscriptionEnd,
      },
    });

    const teamBilling = await prisma.teamBilling.findUniqueOrThrow({
      where: { teamId: entity.id },
      select: { id: true },
    });
    billingId = teamBilling.id;

    // No dunning record — the admin tool will create one
    await prisma.teamDunningStatus.deleteMany({
      where: { teamBillingId: teamBilling.id },
    });

    console.log(`  TeamBilling created (no dunning record — admin tool will create it)`);
  }

  console.log(`  Billing ID: ${billingId}`);
  console.log(`  Customer ID: ${stripeCustomerId}`);
  console.log(`  Price: $${pricePerSeatCents / 100}/seat, ${originalSeatCount} original seats`);

  return {
    id: entity.id,
    slug: entity.slug ?? config.slug,
    name: config.name,
    type: label,
    memberEmails: config.memberEmails,
    memberCount: members.length,
    stripeCustomerId,
    stripeSubscriptionId,
    billingId,
  };
}

// --- Main ---

async function main() {
  console.log("=== Recreate Ownership Seed Script ===\n");
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

    console.log("| Type | Slug           | ID   | Members | Customer ID                    |");
    console.log("|------|----------------|------|---------|--------------------------------|");
    for (const r of results) {
      const type = r.type.padEnd(4);
      const slug = r.slug.padEnd(14);
      const id = String(r.id).padEnd(4);
      const memberCount = String(r.memberCount).padEnd(7);
      const customerId = r.stripeCustomerId.padEnd(30);
      console.log(`| ${type} | ${slug} | ${id} | ${memberCount} | ${customerId} |`);
    }

    console.log(`\nPassword for all member users: ${TEST_PASSWORD}`);

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
    console.log("1. Log in as a Cal.com admin user");
    console.log("2. Go to Admin > Billing and look up one of these customer IDs:");
    for (const r of results) {
      console.log(`     ${r.slug}: ${r.stripeCustomerId}`);
    }
    console.log("3. Click 'Transfer Ownership' — it should detect no owners and show 'Recreate Ownership' mode");
    console.log("4. Search for a member to promote (e.g., recreate-team-member-1@example.com)");
    console.log("5. Click 'Preview Changes' — should show the member promoted to OWNER + CANCELLED dunning");
    console.log("6. Confirm — the member becomes OWNER and a dunning record is upserted as CANCELLED");
    console.log("7. Log in as the promoted member — they should see a 'Resubscribe' banner");
    console.log("8. Click 'Resubscribe' to create a new Stripe Checkout and restore the subscription");

    console.log("\n=== Cleanup ===\n");
    console.log(
      "  npx tsx packages/features/ee/billing/service/dunning/seed-recreate-ownership-test.ts --cleanup --skip-stripe"
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
