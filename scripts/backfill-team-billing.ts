#!/usr/bin/env ts-node

/**
 * Backfill Team Billing Records
 *
 * This script creates/updates TeamBilling and OrganizationBilling records for teams
 * that have Stripe subscriptions but missing or incomplete billing data.
 *
 * Rate Limits:
 * - Stripe API: 100 requests/second (live mode), 25 requests/second (test mode)
 * - Default script rate: ~40 requests/second (2.5x safety margin for live mode)
 * - Configurable via --delay-requests flag
 *
 * Performance (100k teams with default settings):
 * - Batch size: 50 teams
 * - Processing rate: ~40 teams/second
 * - Estimated time: ~42 minutes
 *
 * Usage:
 *   yarn workspace @calcom/prisma backfill-team-billing --dry-run
 *   yarn workspace @calcom/prisma backfill-team-billing
 *   yarn workspace @calcom/prisma backfill-team-billing --batch-size 100 --delay-requests 15
 */

import "dotenv/config";
import process from "node:process";
import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import { Plan } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import stripe from "@calcom/features/ee/payments/server/stripe";
import type { SubLogger } from "@calcom/lib/logger";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type Stripe from "stripe";

const log: SubLogger = logger.getSubLogger({ prefix: ["backfill-team-billing"] });

interface ScriptOptions {
  dryRun: boolean;
  batchSize: number;
  delayBetweenBatches: number;
  delayBetweenRequests: number;
}

interface Stats {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
}

interface TeamWithMetadata {
  id: number;
  name: string;
  isOrganization: boolean;
  metadata: {
    subscriptionId?: string;
    subscriptionItemId?: string;
    paymentId?: string;
  };
}

const DEFAULT_OPTIONS: ScriptOptions = {
  dryRun: false,
  batchSize: 50, // 50 teams per batch
  delayBetweenBatches: 1000, // 1 second between batches
  delayBetweenRequests: 25, // 25ms between Stripe calls = ~40 req/s (well under 100 req/s limit)
};

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_OPTIONS };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--batch-size" && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--delay-batches" && args[i + 1]) {
      options.delayBetweenBatches = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--delay-requests" && args[i + 1]) {
      options.delayBetweenRequests = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return options;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSubscriptionFromStripe(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    if (error instanceof Error) {
      // Check for rate limit error
      if ("statusCode" in error && (error as Stripe.errors.StripeError).statusCode === 429) {
        log.warn(`Rate limited on subscription ${subscriptionId}, waiting 10 seconds...`);
        await sleep(10000);
        // Retry once
        return fetchSubscriptionFromStripe(subscriptionId);
      }
      log.error(`Error fetching subscription ${subscriptionId}: ${error.message}`);
    }
    return null;
  }
}

async function createBillingRecord(
  team: TeamWithMetadata,
  subscription: Stripe.Subscription,
  dryRun: boolean
): Promise<boolean> {
  try {
    const billingService = getBillingProviderService();
    const { subscriptionStart, subscriptionTrialEnd, subscriptionEnd } =
      billingService.extractSubscriptionDates(subscription);
    const { billingPeriod, pricePerSeat } = billingService.extractBillingMetadata(subscription);

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      log.warn(`No subscription item found for team ${team.id}`);
      return false;
    }

    const billingData = {
      teamId: team.id,
      subscriptionId: subscription.id,
      subscriptionItemId,
      customerId: subscription.customer as string,
      status: billingService.mapStripeStatusToCalStatus({
        stripeStatus: subscription.status,
        subscriptionId: subscription.id,
      }),
      planName: team.isOrganization ? Plan.ORGANIZATION : Plan.TEAM,
      subscriptionStart,
      subscriptionTrialEnd,
      subscriptionEnd,
      billingPeriod,
      pricePerSeat,
    };

    if (dryRun) {
      log.info(
        `[DRY RUN] Would create ${team.isOrganization ? "OrganizationBilling" : "TeamBilling"} for team ${team.id} (${team.name}): ${billingPeriod}, $${pricePerSeat}/seat`
      );
      return true;
    }

    if (team.isOrganization) {
      await prisma.organizationBilling.create({
        data: billingData,
      });
      log.info(
        `Created OrganizationBilling for team ${team.id} (${team.name}): ${billingPeriod}, $${pricePerSeat}/seat`
      );
    } else {
      await prisma.teamBilling.create({
        data: billingData,
      });
      log.info(
        `Created TeamBilling for team ${team.id} (${team.name}): ${billingPeriod}, $${pricePerSeat}/seat`
      );
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      log.error(`Failed to create billing record for team ${team.id}: ${error.message}`);
    }
    return false;
  }
}

async function updateBillingRecord(
  team: TeamWithMetadata,
  subscription: Stripe.Subscription,
  dryRun: boolean
): Promise<boolean> {
  try {
    const billingService = getBillingProviderService();
    const { billingPeriod, pricePerSeat } = billingService.extractBillingMetadata(subscription);

    if (dryRun) {
      log.info(
        `[DRY RUN] Would update ${team.isOrganization ? "OrganizationBilling" : "TeamBilling"} for team ${team.id} (${team.name}): ${billingPeriod}, $${pricePerSeat}/seat`
      );
      return true;
    }

    if (team.isOrganization) {
      await prisma.organizationBilling.update({
        where: { teamId: team.id },
        data: {
          billingPeriod,
          pricePerSeat,
        },
      });
      log.info(
        `Updated OrganizationBilling for team ${team.id} (${team.name}): ${billingPeriod}, $${pricePerSeat}/seat`
      );
    } else {
      await prisma.teamBilling.update({
        where: { teamId: team.id },
        data: {
          billingPeriod,
          pricePerSeat,
        },
      });
      log.info(
        `Updated TeamBilling for team ${team.id} (${team.name}): ${billingPeriod}, $${pricePerSeat}/seat`
      );
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      log.error(`Failed to update billing record for team ${team.id}: ${error.message}`);
    }
    return false;
  }
}

async function fetchTeamsBatch(
  cursor: number | null,
  batchSize: number
): Promise<{ teams: TeamWithMetadata[]; nextCursor: number | null }> {
  const teams = await prisma.team.findMany({
    where: {
      metadata: {
        path: ["subscriptionId"],
        not: Prisma.JsonNull,
      },
    },
    select: {
      id: true,
      name: true,
      isOrganization: true,
      metadata: true,
    },
    take: batchSize,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: {
      id: "asc",
    },
  });

  const nextCursor = teams.length === batchSize ? teams[teams.length - 1].id : null;

  const teamData = teams.map((team) => ({
    id: team.id,
    name: team.name,
    isOrganization: team.isOrganization,
    metadata: team.metadata as {
      subscriptionId?: string;
      subscriptionItemId?: string;
      paymentId?: string;
    },
  }));

  return { teams: teamData, nextCursor };
}

async function countTeamsWithSubscriptions(): Promise<number> {
  return await prisma.team.count({
    where: {
      metadata: {
        path: ["subscriptionId"],
        not: Prisma.JsonNull,
      },
    },
  });
}

async function checkExistingBillingRecord(
  team: TeamWithMetadata
): Promise<"missing" | "exists-incomplete" | "exists-complete"> {
  if (team.isOrganization) {
    const existing = await prisma.organizationBilling.findUnique({
      where: { teamId: team.id },
      select: {
        billingPeriod: true,
        pricePerSeat: true,
      },
    });

    if (!existing) return "missing";
    if (existing.billingPeriod === null || existing.pricePerSeat === null) {
      return "exists-incomplete";
    }
    return "exists-complete";
  }

  const existing = await prisma.teamBilling.findUnique({
    where: { teamId: team.id },
    select: {
      billingPeriod: true,
      pricePerSeat: true,
    },
  });

  if (!existing) return "missing";
  if (existing.billingPeriod === null || existing.pricePerSeat === null) {
    return "exists-incomplete";
  }
  return "exists-complete";
}

async function processBatch(teams: TeamWithMetadata[], options: ScriptOptions, stats: Stats): Promise<void> {
  for (const team of teams) {
    const subscriptionId = team.metadata.subscriptionId;

    if (!subscriptionId) {
      stats.skipped++;
      log.debug(`Skipping team ${team.id} - no subscriptionId in metadata`);
      continue;
    }

    // Check if billing record exists and is complete
    const recordStatus = await checkExistingBillingRecord(team);

    if (recordStatus === "exists-complete") {
      stats.skipped++;
      log.debug(`Skipping team ${team.id} (${team.name}) - billing record already complete`);
      continue;
    }

    // Rate limiting
    await sleep(options.delayBetweenRequests);

    // Fetch subscription from Stripe
    const subscription = await fetchSubscriptionFromStripe(subscriptionId);

    if (!subscription) {
      stats.failed++;
      log.warn(`Failed to fetch subscription for team ${team.id} (${team.name})`);
      continue;
    }

    let success = false;

    if (recordStatus === "missing") {
      success = await createBillingRecord(team, subscription, options.dryRun);
      if (success) {
        stats.created++;
      } else {
        stats.failed++;
      }
    } else if (recordStatus === "exists-incomplete") {
      success = await updateBillingRecord(team, subscription, options.dryRun);
      if (success) {
        stats.updated++;
      } else {
        stats.failed++;
      }
    }
  }
}

function printSummary(stats: Stats, startTime: number): void {
  const elapsed = Date.now() - startTime;
  const elapsedMinutes = Math.floor(elapsed / 60000);
  const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);

  log.info("");
  log.info("========================================");
  log.info("Backfill Summary");
  log.info("========================================");
  log.info(`  Created: ${stats.created} (new billing records)`);
  log.info(`  Updated: ${stats.updated} (incomplete records)`);
  log.info(`  Skipped: ${stats.skipped} (already complete)`);
  log.info(`  Failed: ${stats.failed}`);
  log.info(`  Total: ${stats.total}`);
  log.info(`  Time taken: ${elapsedMinutes}m ${elapsedSeconds}s`);
  log.info("========================================");
}

async function main(): Promise<void> {
  const options = parseArgs();
  const startTime = Date.now();

  log.info("========================================");
  log.info("Starting Team Billing Backfill");
  log.info("========================================");
  log.info(`Dry run: ${options.dryRun}`);
  log.info(`Batch size: ${options.batchSize}`);
  log.info(`Delay between batches: ${options.delayBetweenBatches}ms`);
  log.info(`Delay between requests: ${options.delayBetweenRequests}ms`);
  log.info(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
  log.info(`STRIPE_PRIVATE_KEY set: ${!!process.env.STRIPE_PRIVATE_KEY}`);
  log.info("");

  // Count total teams with subscriptions
  log.info("Counting teams with subscriptions...");
  const totalTeams = await countTeamsWithSubscriptions();
  log.info(`Found ${totalTeams} teams with subscriptionId in metadata\n`);

  const stats: Stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: totalTeams,
  };

  // Process teams using cursor-based pagination
  let cursor: number | null = null;
  let batchNumber = 0;
  const estimatedBatches = Math.ceil(totalTeams / options.batchSize);

  log.info(`Processing ~${estimatedBatches} batches...\n`);

  while (true) {
    batchNumber++;

    // Fetch next batch of teams
    const { teams, nextCursor } = await fetchTeamsBatch(cursor, options.batchSize);

    if (teams.length === 0) {
      break;
    }

    log.info(`Processing batch ${batchNumber} (${teams.length} teams)...`);

    await processBatch(teams, options, stats);

    // Print progress every 5 batches
    if (batchNumber % 5 === 0) {
      const processedCount = stats.created + stats.updated + stats.skipped + stats.failed;
      const progress = (processedCount / totalTeams) * 100;
      const elapsed = Date.now() - startTime;
      const elapsedMinutes = Math.floor(elapsed / 60000);

      log.info("========================================");
      log.info(`Progress: ${processedCount}/${totalTeams} teams (${progress.toFixed(1)}%)`);
      log.info(`Elapsed: ${elapsedMinutes}m`);
      log.info(
        `Created: ${stats.created}, updated: ${stats.updated}, skipped: ${stats.skipped}, failed: ${stats.failed}`
      );
      log.info("========================================");
    }

    // Move cursor to next batch
    cursor = nextCursor;

    // Break if no more teams
    if (!nextCursor) {
      break;
    }

    // Delay between batches
    await sleep(options.delayBetweenBatches);
  }

  printSummary(stats, startTime);

  if (options.dryRun) {
    log.info("\n⚠️  This was a DRY RUN - no changes were made to the database");
  }
}

// Run the script
main()
  .then(() => {
    log.info("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    log.error("\n❌ Script failed with error:", error);
    process.exit(1);
  });
