/**
 * Seed script for monthly proration feature
 *
 * Creates test data in both Stripe and the database:
 * - Stripe: customers, products, prices, subscriptions
 * - Database: users, teams, memberships, billing records, seat changes, prorations
 *
 * Usage:
 *   STRIPE_PRIVATE_KEY=sk_test_xxx ts-node scripts/seed-monthly-proration.ts
 *
 * Cleanup:
 *   ts-node scripts/seed-monthly-proration.ts --cleanup
 */

import process from "node:process";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_PRIVATE_KEY || "";

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("❌ STRIPE_PRIVATE_KEY must be set to a test key (sk_test_...)");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

const SEED_PREFIX = "seed-proration";

interface SeededResources {
  users: Array<{ id: number; email: string }>;
  teams: Array<{ id: number; name: string; stripeCustomerId: string; stripeSubscriptionId: string }>;
  stripeProducts: string[];
  stripePrices: string[];
}

async function cleanup() {
  console.log("\n🧹 Starting cleanup...\n");

  // Cleanup database
  console.log("Cleaning up database records...");

  const teams = await prisma.team.findMany({
    where: { name: { startsWith: SEED_PREFIX } },
    select: { id: true },
  });

  for (const team of teams) {
    await prisma.seatChangeLog.deleteMany({ where: { teamId: team.id } });
    await prisma.monthlyProration.deleteMany({ where: { teamId: team.id } });
    await prisma.teamBilling.deleteMany({ where: { teamId: team.id } });
    await prisma.membership.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
  }

  const users = await prisma.user.findMany({
    where: { email: { startsWith: SEED_PREFIX } },
  });

  await prisma.user.deleteMany({
    where: { email: { startsWith: SEED_PREFIX } },
  });

  console.log(`✓ Deleted ${teams.length} teams and ${users.length} users`);

  // Cleanup Stripe
  console.log("\nCleaning up Stripe resources...");

  const subscriptions = await stripe.subscriptions.list({ limit: 100 });
  let deletedSubs = 0;
  for (const sub of subscriptions.data) {
    if (sub.metadata?.seed === SEED_PREFIX) {
      await stripe.subscriptions.cancel(sub.id);
      deletedSubs++;
    }
  }

  const customers = await stripe.customers.list({ limit: 100 });
  let deletedCustomers = 0;
  for (const customer of customers.data) {
    if (customer.metadata?.seed === SEED_PREFIX) {
      await stripe.customers.del(customer.id);
      deletedCustomers++;
    }
  }

  const prices = await stripe.prices.list({ limit: 100 });
  let deactivatedPrices = 0;
  for (const price of prices.data) {
    if (price.metadata?.seed === SEED_PREFIX && price.active) {
      await stripe.prices.update(price.id, { active: false });
      deactivatedPrices++;
    }
  }

  const products = await stripe.products.list({ limit: 100 });
  let deactivatedProducts = 0;
  for (const product of products.data) {
    if (product.metadata?.seed === SEED_PREFIX && product.active) {
      await stripe.products.update(product.id, { active: false });
      deactivatedProducts++;
    }
  }

  console.log(`✓ Deleted ${deletedSubs} subscriptions`);
  console.log(`✓ Deleted ${deletedCustomers} customers`);
  console.log(`✓ Deactivated ${deactivatedPrices} prices`);
  console.log(`✓ Deactivated ${deactivatedProducts} products`);

  console.log("\n✅ Cleanup complete!\n");
}

async function seed(): Promise<SeededResources> {
  console.log("\n🌱 Starting seed process...\n");

  const resources: SeededResources = {
    users: [],
    teams: [],
    stripeProducts: [],
    stripePrices: [],
  };

  // Create Stripe product and price
  console.log("1️⃣  Creating Stripe product and price...");
  const product = await stripe.products.create({
    name: "Cal.com Team Plan (Seed)",
    description: "Annual team plan for testing monthly proration",
    metadata: { seed: SEED_PREFIX },
  });
  resources.stripeProducts.push(product.id);
  console.log(`   ✓ Product: ${product.id}`);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 12000, // $120/year per seat
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { seed: SEED_PREFIX },
  });
  resources.stripePrices.push(price.id);
  console.log(`   ✓ Price: ${price.id} ($120/year)`);

  // Scenario 1: Team at high-water mark (paid for 10, have 10)
  console.log("\n2️⃣  Creating Scenario 1: Team at high-water mark...");
  const scenario1 = await createTeamScenario({
    name: `${SEED_PREFIX}-at-highwater`,
    memberCount: 10,
    paidSeats: 10,
    subscriptionQuantity: 10,
    price,
  });
  resources.users.push(...scenario1.users);
  resources.teams.push(scenario1.team);
  console.log(`   ✓ Team: ${scenario1.team.name} (10 members, paidSeats=10)`);

  // Scenario 2: Team under high-water mark (paid for 10, have 7)
  console.log("\n3️⃣  Creating Scenario 2: Team under high-water mark...");
  const scenario2 = await createTeamScenario({
    name: `${SEED_PREFIX}-under-highwater`,
    memberCount: 7,
    paidSeats: 10,
    subscriptionQuantity: 7,
    price,
  });
  resources.users.push(...scenario2.users);
  resources.teams.push(scenario2.team);
  console.log(`   ✓ Team: ${scenario2.team.name} (7 members, paidSeats=10)`);

  // Add seat changes for scenario 2 showing they removed 3
  await prisma.seatChangeLog.create({
    data: {
      teamId: scenario2.team.id,
      userId: scenario2.users[0].id,
      triggeredBy: scenario2.users[0].id,
      changeType: "REMOVAL",
      seatCount: 3,
      changeDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      monthKey: getCurrentMonthKey(),
    },
  });
  console.log(`   ✓ Added seat change log (3 removals)`);

  // Scenario 3: Team over high-water mark (paid for 10, have 13)
  console.log("\n4️⃣  Creating Scenario 3: Team over high-water mark...");
  const scenario3 = await createTeamScenario({
    name: `${SEED_PREFIX}-over-highwater`,
    memberCount: 13,
    paidSeats: 10,
    subscriptionQuantity: 13,
    price,
  });
  resources.users.push(...scenario3.users);
  resources.teams.push(scenario3.team);
  console.log(`   ✓ Team: ${scenario3.team.name} (13 members, paidSeats=10)`);

  // Add seat changes for scenario 3 showing they added 3
  await prisma.seatChangeLog.createMany({
    data: [
      {
        teamId: scenario3.team.id,
        userId: scenario3.users[10].id,
        triggeredBy: scenario3.users[0].id,
        changeType: "ADDITION",
        seatCount: 1,
        changeDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        monthKey: getCurrentMonthKey(),
      },
      {
        teamId: scenario3.team.id,
        userId: scenario3.users[11].id,
        triggeredBy: scenario3.users[0].id,
        changeType: "ADDITION",
        seatCount: 1,
        changeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        monthKey: getCurrentMonthKey(),
      },
      {
        teamId: scenario3.team.id,
        userId: scenario3.users[12].id,
        triggeredBy: scenario3.users[0].id,
        changeType: "ADDITION",
        seatCount: 1,
        changeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        monthKey: getCurrentMonthKey(),
      },
    ],
  });
  console.log(`   ✓ Added seat change logs (3 additions)`);

  // Add a charged proration for scenario 3 with REAL Stripe invoice
  const teamBilling = await prisma.teamBilling.findUnique({
    where: { teamId: scenario3.team.id },
  });

  // Create real Stripe invoice item
  const invoiceItem = await stripe.invoiceItems.create({
    customer: scenario3.team.stripeCustomerId,
    amount: 33014, // $330.14 in cents
    currency: "usd",
    description: "Prorated charge for 3 additional seats (seed data)",
    metadata: {
      seed: SEED_PREFIX,
      teamId: scenario3.team.id.toString(),
      proration: "true",
      seatsAdded: "3",
    },
  });

  // Create and finalize real Stripe invoice
  const invoice = await stripe.invoices.create({
    customer: scenario3.team.stripeCustomerId,
    auto_advance: false, // Don't auto-finalize
    metadata: {
      seed: SEED_PREFIX,
      teamId: scenario3.team.id.toString(),
    },
  });

  await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.pay(invoice.id);

  await prisma.monthlyProration.create({
    data: {
      teamId: scenario3.team.id,
      monthKey: getPreviousMonthKey(),
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      seatsAtStart: 10,
      seatsAdded: 3,
      seatsRemoved: 0,
      netSeatIncrease: 3,
      seatsAtEnd: 13,
      subscriptionId: scenario3.team.stripeSubscriptionId,
      subscriptionItemId: scenario3.subscriptionItemId,
      customerId: scenario3.team.stripeCustomerId,
      subscriptionStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      subscriptionEnd: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
      remainingDays: 335,
      pricePerSeat: 120,
      proratedAmount: 330.14, // 3 seats * $120 * 335/365
      status: "CHARGED",
      chargedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      invoiceItemId: invoiceItem.id,
      invoiceId: invoice.id,
      teamBillingId: teamBilling!.id,
    },
  });
  console.log(`   ✓ Added historical proration record ($330.14 charged)`);
  console.log(`   ✓ Created real Stripe invoice: ${invoice.id}`);

  // Scenario 4: Team with mixed changes (added 5, removed 2 = net +3)
  console.log("\n5️⃣  Creating Scenario 4: Team with mixed seat changes...");
  const scenario4 = await createTeamScenario({
    name: `${SEED_PREFIX}-mixed-changes`,
    memberCount: 8,
    paidSeats: 5,
    subscriptionQuantity: 8,
    price,
  });
  resources.users.push(...scenario4.users);
  resources.teams.push(scenario4.team);
  console.log(`   ✓ Team: ${scenario4.team.name} (8 members, paidSeats=5)`);

  // Add mixed seat changes
  await prisma.seatChangeLog.createMany({
    data: [
      {
        teamId: scenario4.team.id,
        userId: scenario4.users[5].id,
        triggeredBy: scenario4.users[0].id,
        changeType: "ADDITION",
        seatCount: 5,
        changeDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        monthKey: getCurrentMonthKey(),
      },
      {
        teamId: scenario4.team.id,
        userId: scenario4.users[1].id,
        triggeredBy: scenario4.users[0].id,
        changeType: "REMOVAL",
        seatCount: 2,
        changeDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        monthKey: getCurrentMonthKey(),
      },
    ],
  });
  console.log(`   ✓ Added seat changes (5 additions, 2 removals)`);

  console.log("\n✅ Seed complete!\n");
  console.log("📊 Summary:");
  console.log(`   Users created: ${resources.users.length}`);
  console.log(`   Teams created: ${resources.teams.length}`);
  console.log(`   Stripe products: ${resources.stripeProducts.length}`);
  console.log(`   Stripe prices: ${resources.stripePrices.length}`);
  console.log("\n🔍 Test scenarios:");
  console.log("   1. At high-water mark: 10 seats paid, 10 members → should not charge");
  console.log("   2. Under high-water mark: 10 seats paid, 7 members → should not charge");
  console.log("   3. Over high-water mark: 10 seats paid, 13 members → should charge for 3");
  console.log("   4. Mixed changes: 5 seats paid, 8 members (+5, -2) → should charge for 3");

  return resources;
}

async function createTeamScenario(params: {
  name: string;
  memberCount: number;
  paidSeats: number;
  subscriptionQuantity: number;
  price: Stripe.Price;
}) {
  const { name, memberCount, paidSeats, subscriptionQuantity, price } = params;

  // Create users
  const users = [];
  for (let i = 0; i < memberCount; i++) {
    const user = await prisma.user.create({
      data: {
        email: `${SEED_PREFIX}-${name}-user${i}@example.com`,
        username: `${SEED_PREFIX}-${name}-user${i}`,
        name: `Test User ${i}`,
      },
    });
    users.push(user);
  }

  // Create team
  const team = await prisma.team.create({
    data: {
      name,
      slug: name.toLowerCase(),
      isOrganization: false,
    },
  });

  // Create memberships
  for (let i = 0; i < memberCount; i++) {
    await prisma.membership.create({
      data: {
        userId: users[i].id,
        teamId: team.id,
        role: i === 0 ? MembershipRole.OWNER : MembershipRole.MEMBER,
        accepted: true,
      },
    });
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email: users[0].email,
    name: users[0].name || undefined,
    metadata: {
      seed: SEED_PREFIX,
      teamId: team.id.toString(),
    },
  });

  // Attach test payment method
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  });
  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id, quantity: subscriptionQuantity }],
    metadata: {
      seed: SEED_PREFIX,
      teamId: team.id.toString(),
    },
  });

  // Create TeamBilling record
  await prisma.teamBilling.create({
    data: {
      teamId: team.id,
      subscriptionId: subscription.id,
      subscriptionItemId: subscription.items.data[0].id,
      customerId: customer.id,
      status: "ACTIVE",
      planName: "TEAM",
      billingPeriod: "ANNUALLY",
      pricePerSeat: 120,
      paidSeats,
      subscriptionStart: new Date(subscription.current_period_start * 1000),
      subscriptionEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  return {
    users,
    team: {
      id: team.id,
      name: team.name,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
    },
    subscriptionItemId: subscription.items.data[0].id,
  };
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getPreviousMonthKey(): string {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = previousMonth.getFullYear();
  const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--cleanup")) {
    await cleanup();
  } else {
    await seed();
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("\n❌ Error:", error);
  process.exit(1);
});
