#!/usr/bin/env npx tsx
/**
 * Seed Stripe products and prices needed by billing seed scripts.
 *
 * This creates two products with monthly + annual prices:
 *   - Cal.com Team Plan ($15/seat/month, $144/seat/year)
 *   - Cal.com Organization Plan ($37/seat/month, $360/seat/year)
 *
 * Env vars produced:
 *   STRIPE_TEAM_MONTHLY_PRICE_ID=price_xxx
 *   STRIPE_TEAM_ANNUAL_PRICE_ID=price_xxx
 *   STRIPE_ORG_MONTHLY_PRICE_ID=price_xxx
 *   STRIPE_ORG_ANNUAL_PRICE_ID=price_xxx
 *
 * Usage:
 *   npx env-cmd npx tsx packages/features/ee/billing/seed-stripe-products.ts
 *   npx env-cmd npx tsx packages/features/ee/billing/seed-stripe-products.ts --write-env
 *   npx env-cmd npx tsx packages/features/ee/billing/seed-stripe-products.ts --wipe
 */

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as readline from "node:readline";

import Stripe from "stripe";

const WRITE_ENV = process.argv.includes("--write-env");
const WIPE = process.argv.includes("--wipe");

const TEAM_MONTHLY_PRICE_CENTS = 1500; // $15/seat/month
const TEAM_ANNUAL_PRICE_CENTS = 14400; // $144/seat/year ($12/seat/month equivalent)
const ORG_MONTHLY_PRICE_CENTS = 3700; // $37/seat/month (ORGANIZATION_SELF_SERVE_PRICE default)
const ORG_ANNUAL_PRICE_CENTS = 36000; // $360/seat/year ($30/seat/month equivalent)

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getStripeClient(): Promise<{ stripe: Stripe; stripePrivateKey: string; stripePublicKey: string }> {
  const stripePrivateKey = await prompt("Enter your STRIPE_PRIVATE_KEY (sk_test_...): ");
  if (!stripePrivateKey || !stripePrivateKey.startsWith("sk_")) {
    console.error("Error: Invalid Stripe secret key. It should start with sk_test_ (or sk_live_).");
    process.exit(1);
  }

  const stripePublicKey = await prompt("Enter your NEXT_PUBLIC_STRIPE_PUBLIC_KEY (pk_test_...): ");
  if (!stripePublicKey || !stripePublicKey.startsWith("pk_")) {
    console.error("Error: Invalid Stripe publishable key. It should start with pk_test_ (or pk_live_).");
    process.exit(1);
  }

  const stripe = new Stripe(stripePrivateKey, { apiVersion: "2020-08-27" as Stripe.LatestApiVersion });

  try {
    await stripe.accounts.retrieve();
  } catch (err) {
    console.error("Error: Could not connect to Stripe with the provided key.");
    console.error((err as Error).message);
    process.exit(1);
  }

  console.log("\nConnected to Stripe successfully.\n");
  return { stripe, stripePrivateKey, stripePublicKey };
}

// ---------------------------------------------------------------------------
// Wipe: delete all subscriptions, customers, products, prices, test clocks
// ---------------------------------------------------------------------------

async function listAll<T>(fetcher: (params: Stripe.PaginationParams) => Stripe.ApiListPromise<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of fetcher({ limit: 100 })) {
    items.push(item);
  }
  return items;
}

async function wipeStripe(stripe: Stripe) {
  console.log("=== Wiping Stripe account ===\n");

  // 1. Cancel all subscriptions
  console.log("Cancelling subscriptions...");
  const subscriptions = await listAll((p) => stripe.subscriptions.list({ ...p, status: "all" }));
  let cancelledSubs = 0;
  for (const sub of subscriptions) {
    if (sub.status !== "canceled") {
      try {
        await stripe.subscriptions.cancel(sub.id);
        cancelledSubs++;
      } catch (err) {
        console.log(`  Warning: Could not cancel subscription ${sub.id}: ${(err as Error).message}`);
      }
    }
  }
  console.log(`  Cancelled ${cancelledSubs} subscription(s) (${subscriptions.length} total found)`);

  // 2. Delete test clocks (must be done before deleting customers attached to them)
  console.log("Deleting test clocks...");
  const testClocks = await listAll((p) => stripe.testHelpers.testClocks.list(p));
  let deletedClocks = 0;
  for (const clock of testClocks) {
    try {
      await stripe.testHelpers.testClocks.del(clock.id);
      deletedClocks++;
    } catch (err) {
      console.log(`  Warning: Could not delete test clock ${clock.id}: ${(err as Error).message}`);
    }
  }
  console.log(`  Deleted ${deletedClocks} test clock(s)`);

  // 3. Delete all customers (cascades invoices, payment intents, etc.)
  console.log("Deleting customers...");
  const customers = await listAll((p) => stripe.customers.list(p));
  let deletedCustomers = 0;
  for (const customer of customers) {
    try {
      await stripe.customers.del(customer.id);
      deletedCustomers++;
    } catch (err) {
      console.log(`  Warning: Could not delete customer ${customer.id}: ${(err as Error).message}`);
    }
  }
  console.log(`  Deleted ${deletedCustomers} customer(s)`);

  // 4. Archive all prices (prices can't be deleted, only archived)
  console.log("Archiving prices...");
  const prices = await listAll((p) => stripe.prices.list({ ...p, active: true }));
  let archivedPrices = 0;
  for (const price of prices) {
    try {
      await stripe.prices.update(price.id, { active: false });
      archivedPrices++;
    } catch (err) {
      console.log(`  Warning: Could not archive price ${price.id}: ${(err as Error).message}`);
    }
  }
  console.log(`  Archived ${archivedPrices} price(s)`);

  // 5. Archive all products (products can't be deleted if they have prices)
  console.log("Archiving products...");
  const products = await listAll((p) => stripe.products.list({ ...p, active: true }));
  let archivedProducts = 0;
  for (const product of products) {
    try {
      await stripe.products.update(product.id, { active: false });
      archivedProducts++;
    } catch (err) {
      console.log(`  Warning: Could not archive product ${product.id}: ${(err as Error).message}`);
    }
  }
  console.log(`  Archived ${archivedProducts} product(s)`);

  console.log("\nWipe complete.\n");
}

// ---------------------------------------------------------------------------
// Seed: create products and prices
// ---------------------------------------------------------------------------

async function seedProducts(stripe: Stripe) {
  // --- Team product + prices ---
  console.log("Creating Team product and prices...");
  const teamProduct = await stripe.products.create({
    name: "Cal.com Team Plan (Seed)",
    description: "Per-seat team plan created by billing seed setup",
    metadata: { seedSetup: "true" },
  });

  const teamMonthlyPrice = await stripe.prices.create({
    product: teamProduct.id,
    unit_amount: TEAM_MONTHLY_PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "month", usage_type: "licensed" },
    metadata: { seedSetup: "true" },
  });

  const teamAnnualPrice = await stripe.prices.create({
    product: teamProduct.id,
    unit_amount: TEAM_ANNUAL_PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "year", usage_type: "licensed" },
    metadata: { seedSetup: "true" },
  });

  await stripe.products.update(teamProduct.id, { default_price: teamMonthlyPrice.id });

  console.log(`  Product: ${teamProduct.id} (${teamProduct.name})`);
  console.log(`  Monthly: ${teamMonthlyPrice.id} ($${TEAM_MONTHLY_PRICE_CENTS / 100}/seat/month) [default]`);
  console.log(`  Annual:  ${teamAnnualPrice.id} ($${TEAM_ANNUAL_PRICE_CENTS / 100}/seat/year)`);

  // --- Org product + prices ---
  console.log("\nCreating Organization product and prices...");
  const orgProduct = await stripe.products.create({
    name: "Cal.com Organization Plan (Seed)",
    description: "Per-seat organization plan created by billing seed setup",
    metadata: { seedSetup: "true" },
  });

  const orgMonthlyPrice = await stripe.prices.create({
    product: orgProduct.id,
    unit_amount: ORG_MONTHLY_PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "month", usage_type: "licensed" },
    metadata: { seedSetup: "true" },
  });

  const orgAnnualPrice = await stripe.prices.create({
    product: orgProduct.id,
    unit_amount: ORG_ANNUAL_PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "year", usage_type: "licensed" },
    metadata: { seedSetup: "true" },
  });

  await stripe.products.update(orgProduct.id, { default_price: orgMonthlyPrice.id });

  console.log(`  Product: ${orgProduct.id} (${orgProduct.name})`);
  console.log(`  Monthly: ${orgMonthlyPrice.id} ($${ORG_MONTHLY_PRICE_CENTS / 100}/seat/month) [default]`);
  console.log(`  Annual:  ${orgAnnualPrice.id} ($${ORG_ANNUAL_PRICE_CENTS / 100}/seat/year)`);

  return {
    teamProductId: teamProduct.id,
    orgProductId: orgProduct.id,
    teamMonthlyPriceId: teamMonthlyPrice.id,
    teamAnnualPriceId: teamAnnualPrice.id,
    orgMonthlyPriceId: orgMonthlyPrice.id,
    orgAnnualPriceId: orgAnnualPrice.id,
  };
}

// ---------------------------------------------------------------------------
// .env helpers
// ---------------------------------------------------------------------------

function writeEnvVars(envVars: Record<string, string>) {
  console.log("\n=== Add these to your .env ===\n");
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`  ${key}=${value}`);
  }

  if (!WRITE_ENV) {
    console.log("\nTip: re-run with --write-env to save these to .env automatically.");
    return;
  }

  const envPath = resolve(process.cwd(), ".env");
  let envContent = "";
  try {
    envContent = readFileSync(envPath, "utf-8");
  } catch {
    // .env doesn't exist yet
  }

  const linesToAppend: string[] = [];
  let modified = false;

  for (const [key, value] of Object.entries(envVars)) {
    const line = `${key}=${value}`;
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, line);
      console.log(`\n  Updated ${key} in .env`);
      modified = true;
    } else {
      linesToAppend.push(line);
    }
  }

  if (modified) {
    writeFileSync(envPath, envContent);
  }

  if (linesToAppend.length > 0) {
    const suffix = (envContent.endsWith("\n") || envContent === "" ? "" : "\n") + linesToAppend.join("\n") + "\n";
    appendFileSync(envPath, suffix);
    console.log(`\n  Appended ${linesToAppend.length} var(s) to .env`);
  }

  console.log("\nDone! You can now run the seed scripts:");
  console.log("  npx env-cmd npx tsx packages/features/ee/billing/seed.ts --all");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (WIPE) {
    console.log("=== Stripe Wipe ===\n");
    console.log("This will wipe ALL subscriptions, customers, products, and prices");
    console.log("from your Stripe account.\n");
  } else {
    console.log("=== Stripe Products & Prices Setup ===\n");
    console.log("This will create the Stripe products and prices needed by billing seed scripts.");
    console.log("You only need to run this once per Stripe account.\n");
  }

  const { stripe, stripePrivateKey, stripePublicKey } = await getStripeClient();

  if (WIPE) {
    const confirm = await prompt("Are you sure? This is destructive. Type YES to continue: ");
    if (confirm !== "YES") {
      console.log("Aborted.");
      process.exit(0);
    }
    await wipeStripe(stripe);
    console.log("Done! Run --setup-stripe to create fresh products and prices.");
    return;
  }

  const result = await seedProducts(stripe);

  console.log("\n💡 To enable monthly→annual upsell in Stripe Checkout, configure cross-sells in the Dashboard:");
  console.log(`   Team:         https://dashboard.stripe.com/test/products/${result.teamProductId}`);
  console.log(`   Organization: https://dashboard.stripe.com/test/products/${result.orgProductId}`);

  writeEnvVars({
    STRIPE_PRIVATE_KEY: stripePrivateKey,
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: stripePublicKey,
    STRIPE_TEAM_MONTHLY_PRICE_ID: result.teamMonthlyPriceId,
    STRIPE_TEAM_ANNUAL_PRICE_ID: result.teamAnnualPriceId,
    STRIPE_ORG_MONTHLY_PRICE_ID: result.orgMonthlyPriceId,
    STRIPE_ORG_ANNUAL_PRICE_ID: result.orgAnnualPriceId,
  });
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
