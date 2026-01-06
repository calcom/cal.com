#!/usr/bin/env ts-node

/**
 * Migration script to populate billing period and price per seat for existing subscriptions.
 * This script should be run once before enabling the monthly-proration feature flag.
 *
 * Usage:
 *   ts-node scripts/populate-billing-periods.ts [--dry-run]
 *
 * Options:
 *   --dry-run: Preview changes without writing to database
 */

import { prisma } from "@calcom/prisma";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_PRIVATE_KEY || "";
const DRY_RUN = process.argv.includes("--dry-run");

if (!STRIPE_SECRET_KEY) {
  console.error("error: STRIPE_PRIVATE_KEY environment variable is required");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

async function main() {
  console.log(`starting billing period population (dry-run: ${DRY_RUN})...`);

  const teamsWithBilling = await prisma.team.findMany({
    where: {
      OR: [{ teamBilling: { isNot: null } }, { organizationBilling: { isNot: null } }],
    },
    include: {
      teamBilling: true,
      organizationBilling: true,
    },
  });

  console.log(`found ${teamsWithBilling.length} teams with billing`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const team of teamsWithBilling) {
    const billing = team.teamBilling || team.organizationBilling;
    if (!billing) continue;

    if (billing.billingPeriod && billing.pricePerSeat) {
      console.log(
        `[${team.id}] skipping - already has billingPeriod (${billing.billingPeriod}) and pricePerSeat ($${billing.pricePerSeat})`
      );
      skipped++;
      continue;
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);

      const billingPeriod =
        subscription.items.data[0]?.price.recurring?.interval === "year" ? "ANNUALLY" : "MONTHLY";

      const pricePerSeat = subscription.items.data[0]?.price.unit_amount
        ? subscription.items.data[0].price.unit_amount / 100
        : 0;

      console.log(
        `[${team.id}] ${team.isOrganization ? "org" : "team"} - ${billingPeriod}, $${pricePerSeat}/seat`
      );

      if (!DRY_RUN) {
        if (team.isOrganization && team.organizationBilling) {
          await prisma.organizationBilling.update({
            where: { id: team.organizationBilling.id },
            data: { billingPeriod, pricePerSeat },
          });
        } else if (!team.isOrganization && team.teamBilling) {
          await prisma.teamBilling.update({
            where: { id: team.teamBilling.id },
            data: { billingPeriod, pricePerSeat },
          });
        }
      }

      updated++;
    } catch (error) {
      console.error(`[${team.id}] failed to process:`, error instanceof Error ? error.message : error);
      failed++;
    }
  }

  console.log("\nmigration summary:");
  console.log(`  updated: ${updated}`);
  console.log(`  skipped: ${skipped}`);
  console.log(`  failed: ${failed}`);
  console.log(`  total: ${teamsWithBilling.length}`);

  if (DRY_RUN) {
    console.log("\ndry-run mode - no changes were written to the database");
    console.log("run without --dry-run to apply changes");
  }
}

main()
  .then(() => {
    console.log("\nmigration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nmigration failed:", error);
    process.exit(1);
  });
