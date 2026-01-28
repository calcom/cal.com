#!/usr/bin/env npx tsx
/**
 * Seed script for testing the monthly proration trigger end-to-end.
 *
 * Creates a "trigger-ready" organization that has:
 *   - OrganizationBilling with billingPeriod = ANNUALLY, no trial
 *   - Unprocessed SeatChangeLog entries for the previous month
 *   - NO MonthlyProration records
 *
 * When scheduleMonthlyProration runs, it picks up this org and processes
 * the full proration flow (seat changes -> proration record -> Stripe invoice).
 *
 * Prerequisites:
 *   - STRIPE_PRIVATE_KEY must be set (use test mode key)
 *   - STRIPE_ORG_MONTHLY_PRICE_ID should be set (real org price for correct pricing)
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/dueInvoice/seed-proration-test.ts
 *
 * Options:
 *   --skip-stripe    Skip Stripe API calls (use fake IDs)
 *   --cleanup        Clean up test data before seeding
 */

import { resolve } from "node:path";

import { config } from "dotenv";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

import bcrypt from "bcryptjs";
import Stripe from "stripe";

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

const TEST_PASSWORD = "password123";
const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

const ORG_SLUG = "trigger-test-org";
const TEAM_SLUG = "trigger-test-team";
const ADMIN_EMAIL = "trigger-admin@example.com";
const MEMBER_EMAILS = Array.from(
  { length: 4 },
  (_, i) => `trigger-user-${i + 1}@example.com`
);
const ALL_TEST_EMAILS = [ADMIN_EMAIL, ...MEMBER_EMAILS];

/**
 * Compute the monthKey the scheduleMonthlyProration trigger will use.
 * The trigger processes the previous month in YYYY-MM format (UTC).
 */
function computeTriggerMonthKey(): string {
  const now = new Date();
  const startOfCurrentMonthUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const prevMonth = new Date(startOfCurrentMonthUtc);
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
  const year = prevMonth.getUTCFullYear();
  const month = String(prevMonth.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

interface StripeResources {
  customer: Stripe.Customer | null;
  subscription: Stripe.Subscription | null;
  product: Stripe.Product | null;
  price: Stripe.Price | null;
  pricePerSeat: number;
}

interface SeedResult {
  organization: { id: number; name: string; slug: string };
  team: { id: number; name: string; slug: string };
  monthKey: string;
  unprocessedSeatChanges: number;
  stripe: StripeResources;
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
  organizationId?: number
) {
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

// ---------------------------------------------------------------------------
// Stripe helpers
// ---------------------------------------------------------------------------

async function cleanupStripeResources(stripe: Stripe) {
  console.log("Cleaning up Stripe test resources...");

  const customers = await stripe.customers.list({
    limit: 100,
    email: ADMIN_EMAIL,
  });
  for (const customer of customers.data) {
    try {
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
      await stripe.customers.del(customer.id);
      console.log(`  Deleted customer: ${customer.id}`);
    } catch (error) {
      console.log(`  Could not delete customer ${customer.id}:`, error);
    }
  }

  const products = await stripe.products.list({ limit: 100 });
  for (const product of products.data) {
    if (product.name.startsWith("Trigger Test") && product.active) {
      await stripe.products.update(product.id, { active: false });
      console.log(`  Archived product: ${product.id}`);
    }
  }
}

/**
 * Resolve the real org price from STRIPE_ORG_MONTHLY_PRICE_ID.
 * Falls back to creating a test price if the env var is not set.
 */
async function resolveOrgPrice(
  stripe: Stripe
): Promise<{
  price: Stripe.Price;
  product: Stripe.Product | null;
  monthlyAmount: number;
}> {
  const envPriceId = process.env.STRIPE_ORG_MONTHLY_PRICE_ID;
  if (envPriceId) {
    const price = await stripe.prices.retrieve(envPriceId, {
      expand: ["product"],
    });
    const product =
      typeof price.product === "string"
        ? null
        : (price.product as Stripe.Product);
    const monthlyAmount = price.unit_amount ?? 0;
    console.log(
      `  Using real org price: ${price.id} ($${(monthlyAmount / 100).toFixed(
        2
      )}/${price.recurring?.interval})`
    );
    return { price, product, monthlyAmount };
  }

  console.log(
    "  STRIPE_ORG_MONTHLY_PRICE_ID not set, creating fallback test price"
  );
  const product = await stripe.products.create({
    name: `Trigger Test Product - ${Date.now()}`,
    description: "Fallback test product",
    metadata: { testData: "true" },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 1500,
    currency: "usd",
    recurring: { interval: "month", usage_type: "licensed" },
    metadata: { testData: "true" },
  });
  console.log(`  Created fallback price: ${price.id} ($15.00/month)`);
  return { price, product, monthlyAmount: 1500 };
}

async function createStripeResources(
  stripe: Stripe,
  orgId: number
): Promise<StripeResources> {
  console.log("Creating Stripe resources...");

  const { product: existingProduct, monthlyAmount } = await resolveOrgPrice(
    stripe
  );
  const annualAmount = monthlyAmount * 12;

  // Use the existing product from the real price, or create one
  const product =
    existingProduct ??
    (await stripe.products.create({
      name: `Trigger Test Product - ${Date.now()}`,
      description: "Test product for trigger-ready org (annual billing)",
      metadata: { testData: "true", orgId: orgId.toString() },
    }));

  // Create an annual price derived from the real monthly rate
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: annualAmount,
    currency: "usd",
    recurring: { interval: "year", usage_type: "licensed" },
    metadata: { testData: "true" },
  });
  console.log(
    `  Created annual price: ${price.id} ($${(annualAmount / 100).toFixed(
      2
    )}/year from $${(monthlyAmount / 100).toFixed(2)}/month)`
  );

  const customer = await stripe.customers.create({
    email: ADMIN_EMAIL,
    name: "Trigger Test Org",
    metadata: {
      testData: "true",
      orgId: orgId.toString(),
      calOrgId: orgId.toString(),
    },
  });
  console.log(`  Created customer: ${customer.id}`);

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  });
  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customer.id,
  });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });
  console.log(`  Attached payment method: ${paymentMethod.id}`);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id, quantity: 3 }],
    metadata: { testData: "true", orgId: orgId.toString() },
  });
  console.log(
    `  Created subscription: ${subscription.id} (3 seats @ $${(
      annualAmount / 100
    ).toFixed(2)}/year)`
  );

  return { customer, subscription, product, price, pricePerSeat: annualAmount };
}

// ---------------------------------------------------------------------------
// Database cleanup
// ---------------------------------------------------------------------------

async function cleanupDatabaseResources() {
  console.log("Cleaning up database test resources...");

  const org = await prisma.team.findFirst({ where: { slug: ORG_SLUG } });
  if (!org) {
    console.log("  No test organization found");
    return;
  }

  await prisma.monthlyProration.deleteMany({ where: { teamId: org.id } });
  await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });
  await prisma.organizationBilling.deleteMany({ where: { teamId: org.id } });

  const childTeams = await prisma.team.findMany({
    where: { parentId: org.id },
  });
  for (const t of childTeams) {
    await prisma.membership.deleteMany({ where: { teamId: t.id } });
    await prisma.team.delete({ where: { id: t.id } });
  }

  await prisma.membership.deleteMany({ where: { teamId: org.id } });
  await prisma.team.delete({ where: { id: org.id } });

  for (const email of ALL_TEST_EMAILS) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.password.deleteMany({ where: { userId: user.id } });
        await prisma.membership.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch {
      // Ignore errors
    }
  }

  console.log("  Cleanup complete");
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function seed(): Promise<SeedResult> {
  const stripe = getStripeClient();

  if (CLEANUP_FIRST) {
    await cleanupDatabaseResources();
    if (stripe) {
      await cleanupStripeResources(stripe);
    }
  }

  const monthKey = computeTriggerMonthKey();
  console.log(
    `\nCreating trigger-ready organization (monthKey: ${monthKey})...`
  );

  // Organization
  let org = await prisma.team.findFirst({
    where: { slug: ORG_SLUG, isOrganization: true },
  });
  if (!org) {
    org = await prisma.team.create({
      data: { name: "Trigger Test Org", slug: ORG_SLUG, isOrganization: true },
    });
  }
  console.log(`Organization: ${org.name} (ID: ${org.id})`);

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

  // Child team
  let team = await prisma.team.findFirst({
    where: { slug: TEAM_SLUG, parentId: org.id },
  });
  if (!team) {
    team = await prisma.team.create({
      data: { name: "Trigger Test Team", slug: TEAM_SLUG, parentId: org.id },
    });
  }
  console.log(`Team: ${team.name} (ID: ${team.id})`);

  // Users: 1 admin + 4 members = 5 org members
  const adminUser = await createTestUser(
    ADMIN_EMAIL,
    "Trigger Admin",
    "trigger-admin",
    org.id
  );
  const members = [];
  for (let i = 0; i < MEMBER_EMAILS.length; i++) {
    const user = await createTestUser(
      MEMBER_EMAILS[i],
      `Trigger User ${i + 1}`,
      `trigger-user-${i + 1}`,
      org.id
    );
    members.push(user);
  }

  // Org memberships (all 5)
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: {
      userId: adminUser.id,
      teamId: org.id,
      role: MembershipRole.OWNER,
      accepted: true,
    },
  });
  for (const user of members) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: org.id } },
      update: { role: MembershipRole.MEMBER },
      create: {
        userId: user.id,
        teamId: org.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
  }

  // Sub-team memberships (admin + 2 members)
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: team.id } },
    update: { role: MembershipRole.OWNER },
    create: {
      userId: adminUser.id,
      teamId: team.id,
      role: MembershipRole.OWNER,
      accepted: true,
    },
  });
  for (let i = 0; i < 2; i++) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: members[i].id, teamId: team.id } },
      update: { role: MembershipRole.MEMBER },
      create: {
        userId: members[i].id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
  }

  console.log("Users and memberships created (5 org members, 3 team members)");

  // Stripe resources
  let stripeResources: StripeResources = {
    customer: null,
    subscription: null,
    product: null,
    price: null,
    pricePerSeat: 15000,
  };
  let stripeCustomerId = `cus_fake_trigger_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_trigger_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_trigger_${Date.now()}`;

  if (stripe) {
    stripeResources = await createStripeResources(stripe, org.id);
    stripeCustomerId = stripeResources.customer!.id;
    stripeSubscriptionId = stripeResources.subscription!.id;
    stripeSubscriptionItemId = stripeResources.subscription!.items.data[0].id;
  }

  const pricePerSeat = stripeResources.pricePerSeat;

  // Annual subscription dates: started ~6 months ago, ends ~6 months from now
  const now = new Date();
  const subscriptionStart = new Date(now);
  subscriptionStart.setUTCMonth(subscriptionStart.getUTCMonth() - 6);
  const subscriptionEnd = new Date(now);
  subscriptionEnd.setUTCMonth(subscriptionEnd.getUTCMonth() + 6);

  // OrganizationBilling -- ANNUALLY with no trial so the trigger query picks it up
  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.ANNUALLY,
      pricePerSeat,
      paidSeats: 3,
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
      billingPeriod: BillingPeriod.ANNUALLY,
      pricePerSeat,
      paidSeats: 3,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
    },
  });
  console.log(
    `OrganizationBilling created (ANNUALLY, $${(pricePerSeat / 100).toFixed(
      2
    )}/seat, 3 paid, no trial)`
  );

  // Team metadata so org upgrade banner check is satisfied
  await prisma.team.update({
    where: { id: org.id },
    data: {
      metadata: {
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
      },
    },
  });

  const orgBilling = await prisma.organizationBilling.findUnique({
    where: { teamId: org.id },
  });

  // Clear existing records (idempotent re-runs)
  await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });
  await prisma.monthlyProration.deleteMany({ where: { teamId: org.id } });

  // Create 2 unprocessed ADDITION seat change logs for the trigger's monthKey
  const changeDate = new Date();
  changeDate.setUTCDate(15);
  const [mkYear, mkMonth] = monthKey.split("-").map(Number);
  changeDate.setUTCFullYear(mkYear);
  changeDate.setUTCMonth(mkMonth - 1);

  for (let i = 0; i < 2; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: org.id,
        changeType: "ADDITION",
        seatCount: 1,
        userId: members[2 + i].id,
        triggeredBy: adminUser.id,
        changeDate,
        monthKey,
        processedInProrationId: null,
        organizationBillingId: orgBilling?.id,
        metadata: {
          source: "seed-script",
          note: "Unprocessed seat addition for trigger test",
        },
      },
    });
  }

  console.log(
    `Created 2 unprocessed SeatChangeLog entries (monthKey: ${monthKey})`
  );
  console.log("NO MonthlyProration records created (trigger-ready state)");

  return {
    organization: { id: org.id, name: org.name, slug: org.slug! },
    team: { id: team.id, name: team.name, slug: team.slug! },
    monthKey,
    unprocessedSeatChanges: 2,
    stripe: stripeResources,
  };
}

async function main() {
  console.log("=== Proration Trigger Seed Script ===\n");
  console.log("Options:");
  console.log(`  --skip-stripe: ${SKIP_STRIPE}`);
  console.log(`  --cleanup: ${CLEANUP_FIRST}`);
  console.log("");

  try {
    const result = await seed();

    console.log("\n=== Seed Complete ===\n");
    console.log("Organization:", result.organization);
    console.log("Team:", result.team);
    console.log(`MonthKey: ${result.monthKey}`);
    console.log(`Unprocessed SeatChangeLogs: ${result.unprocessedSeatChanges}`);
    console.log("MonthlyProration records: 0 (intentionally absent)");

    console.log(`\nAdmin: ${ADMIN_EMAIL} (password: ${TEST_PASSWORD})`);

    if (result.stripe.customer) {
      console.log("\nStripe:");
      console.log(
        `  Customer: https://dashboard.stripe.com/test/customers/${result.stripe.customer.id}`
      );
      console.log(
        `  Subscription: https://dashboard.stripe.com/test/subscriptions/${result.stripe.subscription?.id}`
      );
      console.log(
        `  Price per seat: $${(result.stripe.pricePerSeat / 100).toFixed(
          2
        )}/year`
      );
    }

    console.log("\n=== What the trigger will do ===\n");
    console.log("When scheduleMonthlyProration runs, it will:");
    console.log(
      `  1. Query for annual orgs with unprocessed seat changes for monthKey "${result.monthKey}"`
    );
    console.log(
      `  2. Find ${ORG_SLUG} with ${result.unprocessedSeatChanges} additions, 0 removals`
    );
    console.log(
      "  3. Calculate prorated amount based on remaining annual subscription days"
    );
    console.log("  4. Create a MonthlyProration record");
    console.log("  5. Mark SeatChangeLog entries as processed");
    console.log("  6. Create a Stripe invoice (if amount > 0)");

    console.log("\n=== Verification queries ===\n");
    console.log(
      `SELECT * FROM "MonthlyProration" WHERE "teamId" = ${result.organization.id};`
    );
    console.log(
      `SELECT * FROM "SeatChangeLog" WHERE "teamId" = ${result.organization.id} AND "processedInProrationId" IS NOT NULL;`
    );

    console.log("\n=== Cleanup ===\n");
    console.log("To clean up all test data, run:");
    console.log(
      "  npx tsx packages/features/ee/billing/service/dueInvoice/seed-proration-test.ts --cleanup --skip-stripe"
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
