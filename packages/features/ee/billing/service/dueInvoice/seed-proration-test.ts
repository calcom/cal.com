#!/usr/bin/env npx tsx

/**
 * Seed script for testing due invoice banner and invitation blocking
 *
 * This script creates:
 * 1. A test organization with billing data
 * 2. A test team under the organization
 * 3. Test users with billing permissions
 * 4. Real Stripe customers, subscriptions, and invoices
 * 5. MonthlyProration records to simulate overdue invoices
 *
 * Prerequisites:
 *   - STRIPE_PRIVATE_KEY must be set (use test mode key)
 *   - STRIPE_ORG_MONTHLY_PRICE_ID or STRIPE_TEAM_MONTHLY_PRICE_ID should be set
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/service/dueInvoice/seed-proration-test.ts
 *
 * Options:
 *   --skip-stripe    Skip Stripe API calls (use fake IDs)
 *   --cleanup        Clean up test data before seeding
 */

import { resolve } from "node:path";
import process from "node:process";
import { config } from "dotenv";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "@calcom/prisma";
import { BillingPeriod, MembershipRole } from "@calcom/prisma/enums";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

const TEST_PASSWORD = "password123";
const SKIP_STRIPE = process.argv.includes("--skip-stripe");
const CLEANUP_FIRST = process.argv.includes("--cleanup");

const TRIGGER_ORG_SLUG = "trigger-test-org";
const TRIGGER_TEAM_SLUG = "trigger-test-team";
const TRIGGER_ADMIN_EMAIL = "trigger-admin@example.com";
const TRIGGER_MEMBER_EMAILS = Array.from({ length: 4 }, (_, i) => `trigger-user-${i + 1}@example.com`);

/**
 * Compute the monthKey the scheduleMonthlyProration trigger will use.
 * The trigger processes the previous month in YYYY-MM format (UTC).
 */
function computeTriggerMonthKey(): string {
  const now = new Date();
  const startOfCurrentMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // Previous month
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
}

interface TriggerOrgResult {
  organization: { id: number; name: string; slug: string };
  team: { id: number; name: string; slug: string };
  monthKey: string;
  unprocessedSeatChanges: number;
  stripe: StripeResources;
}

interface SeedResult {
  organization: { id: number; name: string; slug: string };
  team: { id: number; name: string; slug: string };
  users: Array<{ email: string; name: string; role: string }>;
  prorations: Array<{ id: string; status: string; isBlocking: boolean }>;
  stripe: StripeResources;
  triggerOrg: TriggerOrgResult | null;
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

  // Find and delete test customers for both orgs
  const emailsToCleanup = ["proration-admin@example.com", TRIGGER_ADMIN_EMAIL];
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

  // Find and archive test products
  const products = await stripe.products.list({
    limit: 100,
  });

  for (const product of products.data) {
    if (
      (product.name.startsWith("Proration Test") || product.name.startsWith("Trigger Test")) &&
      product.active
    ) {
      await stripe.products.update(product.id, { active: false });
      console.log(`  Archived product: ${product.id}`);
    }
  }
}

async function createStripeResources(stripe: Stripe, orgId: number): Promise<StripeResources> {
  console.log("Creating Stripe resources...");

  // Create a test product
  const product = await stripe.products.create({
    name: `Proration Test Product - ${Date.now()}`,
    description: "Test product for proration testing",
    metadata: {
      testData: "true",
      orgId: orgId.toString(),
    },
  });
  console.log(`  Created product: ${product.id}`);

  // Create a price for the product ($15/seat/month)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 1500, // $15.00
    currency: "usd",
    recurring: {
      interval: "month",
      usage_type: "licensed",
    },
    metadata: {
      testData: "true",
    },
  });
  console.log(`  Created price: ${price.id}`);

  // Create a customer
  const customer = await stripe.customers.create({
    email: "proration-admin@example.com",
    name: "Proration Test Org",
    metadata: {
      testData: "true",
      orgId: orgId.toString(),
      calOrgId: orgId.toString(),
    },
  });
  console.log(`  Created customer: ${customer.id}`);

  // Add a test payment method (test card)
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: {
      token: "tok_visa", // Test token for successful payments
    },
  });

  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customer.id,
  });

  await stripe.customers.update(customer.id, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });
  console.log(`  Attached payment method: ${paymentMethod.id}`);

  // Create a subscription with 5 seats
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price: price.id,
        quantity: 5,
      },
    ],
    metadata: {
      testData: "true",
      orgId: orgId.toString(),
    },
  });
  console.log(`  Created subscription: ${subscription.id}`);

  return { customer, subscription, product, price };
}

async function createFailedInvoice(
  stripe: Stripe,
  customerId: string,
  amount: number,
  description: string
): Promise<Stripe.Invoice> {
  console.log(`Creating invoice for $${(amount / 100).toFixed(2)}...`);

  // Create an invoice item
  await stripe.invoiceItems.create({
    customer: customerId,
    amount,
    currency: "usd",
    description,
  });

  // Create and finalize the invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: false, // Don't auto-charge
    metadata: {
      testData: "true",
      prorationTest: "true",
    },
  });

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
  console.log(`  Created invoice: ${finalizedInvoice.id} (status: ${finalizedInvoice.status})`);

  return finalizedInvoice;
}

async function createStripeResourcesForTriggerOrg(stripe: Stripe, orgId: number): Promise<StripeResources> {
  console.log("Creating Stripe resources for trigger org (annual)...");

  const product = await stripe.products.create({
    name: `Trigger Test Product - ${Date.now()}`,
    description: "Test product for trigger-ready org (annual billing)",
    metadata: {
      testData: "true",
      orgId: orgId.toString(),
    },
  });
  console.log(`  Created product: ${product.id}`);

  // Annual pricing at $150/seat/year ($12.50/month equivalent)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 15000, // $150.00/year
    currency: "usd",
    recurring: {
      interval: "year",
      usage_type: "licensed",
    },
    metadata: { testData: "true" },
  });
  console.log(`  Created price: ${price.id}`);

  const customer = await stripe.customers.create({
    email: TRIGGER_ADMIN_EMAIL,
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

  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });
  console.log(`  Attached payment method: ${paymentMethod.id}`);

  // Create annual subscription with 3 seats
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id, quantity: 3 }],
    metadata: {
      testData: "true",
      orgId: orgId.toString(),
    },
  });
  console.log(`  Created subscription: ${subscription.id}`);

  return { customer, subscription, product, price };
}

async function cleanupDatabaseResources() {
  console.log("Cleaning up database test resources...");

  // Clean up trigger-test-org
  const triggerOrg = await prisma.team.findFirst({
    where: { slug: TRIGGER_ORG_SLUG },
  });

  if (triggerOrg) {
    await prisma.monthlyProration.deleteMany({ where: { teamId: triggerOrg.id } });
    await prisma.seatChangeLog.deleteMany({ where: { teamId: triggerOrg.id } });
    await prisma.organizationBilling.deleteMany({ where: { teamId: triggerOrg.id } });

    const triggerChildTeams = await prisma.team.findMany({ where: { parentId: triggerOrg.id } });
    for (const t of triggerChildTeams) {
      await prisma.membership.deleteMany({ where: { teamId: t.id } });
      await prisma.team.delete({ where: { id: t.id } });
    }

    await prisma.membership.deleteMany({ where: { teamId: triggerOrg.id } });
    await prisma.team.delete({ where: { id: triggerOrg.id } });

    const triggerEmails = [TRIGGER_ADMIN_EMAIL, ...TRIGGER_MEMBER_EMAILS];
    for (const email of triggerEmails) {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.password.deleteMany({ where: { userId: user.id } });
          await prisma.membership.deleteMany({ where: { userId: user.id } });
          await prisma.profile.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      } catch {
        // Ignore errors
      }
    }

    console.log("  Trigger org cleanup complete");
  }

  // Clean up proration-test-org
  const org = await prisma.team.findFirst({
    where: { slug: "proration-test-org" },
  });

  if (!org) {
    console.log("  No test organization found");
    return;
  }

  // Delete proration records
  await prisma.monthlyProration.deleteMany({ where: { teamId: org.id } });

  // Delete seat change logs
  await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });

  // Delete organization billing
  await prisma.organizationBilling.deleteMany({ where: { teamId: org.id } });

  // Find and delete child teams
  const childTeams = await prisma.team.findMany({ where: { parentId: org.id } });
  for (const team of childTeams) {
    await prisma.membership.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
  }

  // Delete org memberships
  await prisma.membership.deleteMany({ where: { teamId: org.id } });

  // Delete organization
  await prisma.team.delete({ where: { id: org.id } });

  // Delete test users
  const testEmails = [
    "proration-admin@example.com",
    "proration-member@example.com",
    ...Array.from({ length: 6 }, (_, i) => `proration-user-${i + 1}@example.com`),
  ];
  for (const email of testEmails) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.password.deleteMany({ where: { userId: user.id } });
        await prisma.membership.deleteMany({ where: { userId: user.id } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch {
      // Ignore errors
    }
  }

  console.log("  Database cleanup complete");
}

async function seedTriggerReadyOrg(stripe: Stripe | null): Promise<TriggerOrgResult> {
  const monthKey = computeTriggerMonthKey();
  console.log(`\nCreating trigger-ready organization (monthKey: ${monthKey})...`);

  // Create organization
  let org = await prisma.team.findFirst({
    where: { slug: TRIGGER_ORG_SLUG, isOrganization: true },
  });

  if (!org) {
    org = await prisma.team.create({
      data: {
        name: "Trigger Test Org",
        slug: TRIGGER_ORG_SLUG,
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

  // Create child team
  let team = await prisma.team.findFirst({
    where: { slug: TRIGGER_TEAM_SLUG, parentId: org.id },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Trigger Test Team",
        slug: TRIGGER_TEAM_SLUG,
        parentId: org.id,
      },
    });
  }
  console.log(`  Team created: ${team.name} (ID: ${team.id})`);

  // Create users: 1 admin + 4 members = 5 total org members
  const adminUser = await createTestUser(TRIGGER_ADMIN_EMAIL, "Trigger Admin", "trigger-admin", org.id);
  const members = [];
  for (let i = 0; i < TRIGGER_MEMBER_EMAILS.length; i++) {
    const user = await createTestUser(
      TRIGGER_MEMBER_EMAILS[i],
      `Trigger User ${i + 1}`,
      `trigger-user-${i + 1}`,
      org.id
    );
    members.push(user);
  }

  // Add all 5 users to org
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
  });

  for (const user of members) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: org.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: user.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  // Add admin + 2 members to the sub-team (3 team memberships)
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: adminUser.id, teamId: team.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: adminUser.id, teamId: team.id, role: MembershipRole.OWNER, accepted: true },
  });
  for (let i = 0; i < 2; i++) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: members[i].id, teamId: team.id } },
      update: { role: MembershipRole.MEMBER },
      create: { userId: members[i].id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
    });
  }

  console.log("  Users and memberships created (5 org members, 3 team members)");

  // Stripe resources or fake IDs
  let stripeResources: StripeResources = { customer: null, subscription: null, product: null, price: null };
  let stripeCustomerId = `cus_fake_trigger_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_trigger_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_trigger_${Date.now()}`;

  if (stripe) {
    stripeResources = await createStripeResourcesForTriggerOrg(stripe, org.id);
    stripeCustomerId = stripeResources.customer!.id;
    stripeSubscriptionId = stripeResources.subscription!.id;
    stripeSubscriptionItemId = stripeResources.subscription!.items.data[0].id;
  }

  // Annual subscription dates: started ~6 months ago, ends ~6 months from now
  const now = new Date();
  const subscriptionStart = new Date(now);
  subscriptionStart.setUTCMonth(subscriptionStart.getUTCMonth() - 6);
  const subscriptionEnd = new Date(now);
  subscriptionEnd.setUTCMonth(subscriptionEnd.getUTCMonth() + 6);

  // Create OrganizationBilling with ANNUALLY period and no trial
  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      billingPeriod: BillingPeriod.ANNUALLY,
      pricePerSeat: 15000,
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
      pricePerSeat: 15000,
      paidSeats: 3,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd: null,
    },
  });
  console.log("  OrganizationBilling created (ANNUALLY, $150/seat, 3 paid seats, no trial)");

  // Set team metadata so org upgrade banner check is satisfied
  await prisma.team.update({
    where: { id: org.id },
    data: {
      metadata: {
        subscriptionId: stripeSubscriptionId,
        subscriptionItemId: stripeSubscriptionItemId,
      },
    },
  });

  // Get billing record for linking seat changes
  const orgBilling = await prisma.organizationBilling.findUnique({
    where: { teamId: org.id },
  });

  // Clear any existing seat changes / prorations (idempotent re-runs)
  await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });
  await prisma.monthlyProration.deleteMany({ where: { teamId: org.id } });

  // Create 2 unprocessed ADDITION seat change logs with the trigger's monthKey
  const changeDate = new Date();
  changeDate.setUTCDate(15); // Mid-month change
  // Set to the month matching monthKey
  const [mkYear, mkMonth] = monthKey.split("-").map(Number);
  changeDate.setUTCFullYear(mkYear);
  changeDate.setUTCMonth(mkMonth - 1);

  for (let i = 0; i < 2; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: org.id,
        changeType: "ADDITION",
        seatCount: 1,
        userId: members[2 + i].id, // Members 3 and 4 (the ones beyond paidSeats of 3)
        triggeredBy: adminUser.id,
        changeDate,
        monthKey,
        processedInProrationId: null, // Unprocessed - key for trigger pickup
        organizationBillingId: orgBilling?.id,
        metadata: { source: "seed-script", note: "Unprocessed seat addition for trigger test" },
      },
    });
  }

  console.log(`  Created 2 unprocessed SeatChangeLog entries (monthKey: ${monthKey})`);
  console.log("  NO MonthlyProration records created (trigger-ready state)");

  return {
    organization: { id: org.id, name: org.name, slug: org.slug! },
    team: { id: team.id, name: team.name, slug: team.slug! },
    monthKey,
    unprocessedSeatChanges: 2,
    stripe: stripeResources,
  };
}

async function seedProrationTest(): Promise<SeedResult> {
  const stripe = getStripeClient();

  if (CLEANUP_FIRST) {
    await cleanupDatabaseResources();
    if (stripe) {
      await cleanupStripeResources(stripe);
    }
  }

  console.log("\nCreating test organization...");

  // Create organization - find existing or create new
  let org = await prisma.team.findFirst({
    where: {
      slug: "proration-test-org",
      isOrganization: true,
    },
  });

  if (!org) {
    org = await prisma.team.create({
      data: {
        name: "Proration Test Org",
        slug: "proration-test-org",
        isOrganization: true,
      },
    });
  }

  console.log(`Organization created: ${org.name} (ID: ${org.id})`);

  // Create OrganizationSettings for the org
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

  console.log("Organization settings created");

  // Create team under organization - find existing or create new
  let team = await prisma.team.findFirst({
    where: {
      slug: "proration-test-team",
      parentId: org.id,
    },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Proration Test Team",
        slug: "proration-test-team",
        parentId: org.id,
      },
    });
  }

  console.log(`Team created: ${team.name} (ID: ${team.id})`);

  // Create test users (with organizationId set to link them to the org)
  console.log("Creating test users...");

  const adminUser = await createTestUser(
    "proration-admin@example.com",
    "Proration Admin",
    "proration-admin",
    org.id
  );

  const memberUser = await createTestUser(
    "proration-member@example.com",
    "Proration Member",
    "proration-member",
    org.id
  );

  // Create additional org members to simulate realistic seat count
  const additionalMembers = [];
  for (let i = 1; i <= 6; i++) {
    const user = await createTestUser(
      `proration-user-${i}@example.com`,
      `Proration User ${i}`,
      `proration-user-${i}`,
      org.id
    );
    additionalMembers.push(user);
  }

  // Add admin to organization as OWNER
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

  // Add member to organization
  await prisma.membership.upsert({
    where: { userId_teamId: { userId: memberUser.id, teamId: org.id } },
    update: { role: MembershipRole.MEMBER },
    create: {
      userId: memberUser.id,
      teamId: org.id,
      role: MembershipRole.MEMBER,
      accepted: true,
    },
  });

  // Add additional members to organization (simulating 8 total members: admin + member + 6 additional)
  for (const user of additionalMembers) {
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

  // Add admin to team
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

  // Add some members to the sub-team as well
  for (let i = 0; i < 3; i++) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: additionalMembers[i].id, teamId: team.id } },
      update: { role: MembershipRole.MEMBER },
      create: {
        userId: additionalMembers[i].id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
  }

  console.log("Users added to organization and team (8 org members, 4 team members)");

  // Create Stripe resources or use fake IDs
  let stripeResources: StripeResources = {
    customer: null,
    subscription: null,
    product: null,
    price: null,
  };

  let stripeCustomerId = `cus_fake_${Date.now()}`;
  let stripeSubscriptionId = `sub_fake_${Date.now()}`;
  let stripeSubscriptionItemId = `si_fake_${Date.now()}`;

  if (stripe) {
    stripeResources = await createStripeResources(stripe, org.id);
    stripeCustomerId = stripeResources.customer!.id;
    stripeSubscriptionId = stripeResources.subscription!.id;
    stripeSubscriptionItemId = stripeResources.subscription!.items.data[0].id;

    // Create a separate invoice that will remain unpaid (simulating failed proration)
    await createFailedInvoice(stripe, stripeCustomerId, 3000, "Proration charge - 3 additional seats");
  }

  // Create OrganizationBilling record
  await prisma.organizationBilling.upsert({
    where: { teamId: org.id },
    update: {
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
    },
    create: {
      teamId: org.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      status: "ACTIVE",
      planName: "ORGANIZATION",
      subscriptionStart: new Date(),
      pricePerSeat: 1500,
      paidSeats: 5,
    },
  });

  console.log("Organization billing created");

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

  console.log("Organization team metadata updated with subscriptionId");

  // Get the organization billing record for linking seat changes
  const orgBilling = await prisma.organizationBilling.findUnique({
    where: { teamId: org.id },
  });

  // Create test MonthlyProration records
  console.log("Creating test proration and seat change records...");

  const now = new Date();
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Clear existing prorations and seat change logs for this team
  await prisma.seatChangeLog.deleteMany({ where: { teamId: org.id } });
  await prisma.monthlyProration.deleteMany({ where: { teamId: org.id } });

  // Blocking proration (8 days old, FAILED status)
  const blockingProration = await prisma.monthlyProration.create({
    data: {
      teamId: org.id,
      monthKey: "2025-01",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-31"),
      seatsAtStart: 5,
      seatsAdded: 3,
      seatsRemoved: 0,
      netSeatIncrease: 3,
      seatsAtEnd: 8,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      customerId: stripeCustomerId,
      subscriptionStart: new Date("2025-01-01"),
      subscriptionEnd: new Date("2025-12-31"),
      remainingDays: 20,
      pricePerSeat: 1500,
      proratedAmount: 3000, // $30.00
      status: "FAILED",
      createdAt: eightDaysAgo,
      failedAt: eightDaysAgo,
      failureReason: "card_declined",
    },
  });

  // Warning proration (2 days old, INVOICE_CREATED status) - use different monthKey
  const warningProration = await prisma.monthlyProration.create({
    data: {
      teamId: org.id,
      monthKey: "2025-02",
      periodStart: new Date("2025-02-01"),
      periodEnd: new Date("2025-02-28"),
      seatsAtStart: 8,
      seatsAdded: 2,
      seatsRemoved: 0,
      netSeatIncrease: 2,
      seatsAtEnd: 10,
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: `${stripeSubscriptionItemId}_2`,
      customerId: stripeCustomerId,
      subscriptionStart: new Date("2025-01-01"),
      subscriptionEnd: new Date("2025-12-31"),
      remainingDays: 15,
      pricePerSeat: 1500,
      proratedAmount: 1500, // $15.00
      status: "INVOICE_CREATED",
      createdAt: twoDaysAgo,
    },
  });

  // Create SeatChangeLog entries that correspond to the prorations
  console.log("Creating seat change logs...");

  // Initial 5 seats (original team members) - these would have been added when org was created
  const initialAdditionDate = new Date(eightDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000); // 38 days ago

  // Create seat addition logs for initial members (admin + member = 2, then 3 more = 5 total initial)
  for (let i = 0; i < 5; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: org.id,
        changeType: "ADDITION",
        seatCount: 1,
        userId: i === 0 ? adminUser.id : i === 1 ? memberUser.id : additionalMembers[i - 2].id,
        triggeredBy: adminUser.id,
        changeDate: initialAdditionDate,
        monthKey: "2024-12",
        organizationBillingId: orgBilling?.id,
        metadata: { source: "seed-script", note: "Initial org member" },
      },
    });
  }

  // Seat additions that triggered the FAILED proration (3 seats added 8 days ago)
  for (let i = 0; i < 3; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: org.id,
        changeType: "ADDITION",
        seatCount: 1,
        userId: additionalMembers[3 + i].id, // Users 4, 5, 6
        triggeredBy: adminUser.id,
        changeDate: eightDaysAgo,
        monthKey: "2025-01",
        processedInProrationId: blockingProration.id,
        organizationBillingId: orgBilling?.id,
        metadata: { source: "seed-script", note: "Seat addition that failed to charge" },
      },
    });
  }

  // More recent seat change attempt (2 seats, 2 days ago) - linked to warning proration
  // These are pending/invoice created but not yet charged
  for (let i = 0; i < 2; i++) {
    await prisma.seatChangeLog.create({
      data: {
        teamId: org.id,
        changeType: "ADDITION",
        seatCount: 1,
        userId: null, // Simulating pending invites that haven't been accepted yet
        triggeredBy: adminUser.id,
        changeDate: twoDaysAgo,
        monthKey: "2025-02",
        processedInProrationId: warningProration.id,
        organizationBillingId: orgBilling?.id,
        metadata: { source: "seed-script", note: "Recent seat addition pending payment" },
      },
    });
  }

  console.log("Proration and seat change records created");

  // Seed the trigger-ready org (no MonthlyProration, unprocessed seat changes)
  const triggerOrgResult = await seedTriggerReadyOrg(stripe);

  return {
    organization: { id: org.id, name: org.name, slug: org.slug! },
    team: { id: team.id, name: team.name, slug: team.slug! },
    users: [
      { email: adminUser.email, name: adminUser.name!, role: "OWNER" },
      { email: memberUser.email, name: memberUser.name!, role: "MEMBER" },
    ],
    prorations: [
      { id: blockingProration.id, status: "FAILED", isBlocking: true },
      { id: warningProration.id, status: "INVOICE_CREATED", isBlocking: false },
    ],
    stripe: stripeResources,
    triggerOrg: triggerOrgResult,
  };
}

async function main() {
  console.log("=== Proration Test Seed Script ===\n");
  console.log("Options:");
  console.log(`  --skip-stripe: ${SKIP_STRIPE}`);
  console.log(`  --cleanup: ${CLEANUP_FIRST}`);
  console.log("");

  try {
    const result = await seedProrationTest();

    console.log("\n=== Seed Complete ===\n");
    console.log("Organization:", result.organization);
    console.log("Team:", result.team);

    console.log("\nTest Users:");
    result.users.forEach((u) => {
      console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}`);
    });
    console.log(`  Password for all users: ${TEST_PASSWORD}`);

    console.log("\nProration Records:");
    result.prorations.forEach((p) => {
      console.log(`  - ${p.id}: ${p.status} (blocking: ${p.isBlocking})`);
    });

    if (result.stripe.customer) {
      console.log("\nStripe Resources:");
      console.log(`  Customer: ${result.stripe.customer.id}`);
      console.log(`  Subscription: ${result.stripe.subscription?.id}`);
      console.log(`  Product: ${result.stripe.product?.id}`);
      console.log(`  Price: ${result.stripe.price?.id}`);
    }

    console.log("\n=== Testing Instructions ===\n");
    console.log("1. Login as proration-admin@example.com");
    console.log("   - Should see the due invoice banner (error variant - blocking)");
    console.log("   - Should be blocked from inviting new members");
    console.log("");
    console.log("2. Login as proration-member@example.com");
    console.log("   - Should NOT see the due invoice banner (not a billing admin)");
    console.log("");
    console.log("3. To test sub-team exception:");
    console.log("   - Try inviting proration-member@example.com to the sub-team");
    console.log("   - This should succeed (existing org member)");
    console.log("   - Try inviting a new email - this should be blocked");
    console.log("");

    if (result.stripe.customer) {
      console.log("=== Stripe Dashboard (Proration Org) ===\n");
      console.log(`Customer: https://dashboard.stripe.com/test/customers/${result.stripe.customer.id}`);
      console.log(
        `Subscription: https://dashboard.stripe.com/test/subscriptions/${result.stripe.subscription?.id}`
      );
      console.log("");
    }

    // Trigger-ready org output
    if (result.triggerOrg) {
      const t = result.triggerOrg;
      console.log("=== Trigger-Ready Organization ===\n");
      console.log("Organization:", t.organization);
      console.log("Team:", t.team);
      console.log(`MonthKey: ${t.monthKey}`);
      console.log(`Unprocessed SeatChangeLogs: ${t.unprocessedSeatChanges}`);
      console.log("MonthlyProration records: 0 (intentionally absent)");

      if (t.stripe.customer) {
        console.log(`\nStripe (Trigger Org):`);
        console.log(`  Customer: https://dashboard.stripe.com/test/customers/${t.stripe.customer.id}`);
        console.log(
          `  Subscription: https://dashboard.stripe.com/test/subscriptions/${t.stripe.subscription?.id}`
        );
      }

      console.log("\n=== Trigger Testing Instructions ===\n");
      console.log("When scheduleMonthlyProration runs, it will:");
      console.log(`  1. Query for annual orgs with unprocessed seat changes for monthKey "${t.monthKey}"`);
      console.log(`  2. Find trigger-test-org with ${t.unprocessedSeatChanges} additions, 0 removals`);
      console.log("  3. Calculate prorated amount based on remaining annual subscription days");
      console.log("  4. Create a MonthlyProration record");
      console.log("  5. Mark SeatChangeLog entries as processed");
      console.log("  6. Create a Stripe invoice (if amount > 0)");
      console.log("");
      console.log("To verify after trigger runs:");
      console.log(`  SELECT * FROM "MonthlyProration" WHERE "teamId" = ${t.organization.id};`);
      console.log(
        `  SELECT * FROM "SeatChangeLog" WHERE "teamId" = ${t.organization.id} AND "processedInProrationId" IS NOT NULL;`
      );
      console.log("");
    }

    console.log("=== Cleanup ===\n");
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
