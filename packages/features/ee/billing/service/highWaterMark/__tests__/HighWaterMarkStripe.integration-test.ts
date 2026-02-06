/**
 * Note: Stripe test clocks have a limitation where webhooks fire DURING clock
 * advancement, but Stripe blocks any subscription modifications until the clock
 * finishes advancing. This causes webhook handlers to fail with:
 * "Test clock advancement underway - cannot perform modifications"
 *
 * To work around this, after advancing the clock and waiting for it to be ready,
 * we manually call the HWM service methods to simulate what the webhook would do.
 * In production (without test clocks), webhooks work normally.
 */
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { BillingPeriod, MembershipRole } from "@calcom/prisma/enums";

import { StripeBillingService } from "../../billingProvider/StripeBillingService";
import { HighWaterMarkService } from "../HighWaterMarkService";

const STRIPE_PRIVATE_KEY = process.env.STRIPE_PRIVATE_KEY;
const STRIPE_TEAM_MONTHLY_PRICE_ID = process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;

// Skip if Stripe is not configured
const describeIfStripe =
  STRIPE_PRIVATE_KEY && STRIPE_TEAM_MONTHLY_PRICE_ID ? describe : describe.skip;

describeIfStripe("HighWaterMark Stripe E2E Test", () => {
  let stripe: Stripe;
  let testClock: Stripe.TestHelpers.TestClock;
  let customer: Stripe.Customer;
  let subscription: Stripe.Subscription;
  let testTeam: Team;
  let testUsers: User[] = [];

  const TEST_PREFIX = `hwm-e2e-${Date.now()}`;

  beforeAll(async () => {
    stripe = new Stripe(STRIPE_PRIVATE_KEY!, { apiVersion: "2020-08-27" });

    // Enable the hwm-seating feature flag for the test
    await prisma.feature.upsert({
      where: { slug: "hwm-seating" },
      update: { enabled: true },
      create: {
        slug: "hwm-seating",
        enabled: true,
        description: "High water mark seating for monthly billing",
        type: "RELEASE",
        stale: false,
      },
    });

    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-admin@example.com`,
        username: `${TEST_PREFIX}-admin`,
        name: "HWM E2E Admin",
      },
    });
    testUsers.push(adminUser);

    // Create 3 additional members (total 4 current members)
    for (let i = 1; i <= 3; i++) {
      const user = await prisma.user.create({
        data: {
          email: `${TEST_PREFIX}-member-${i}@example.com`,
          username: `${TEST_PREFIX}-member-${i}`,
          name: `HWM E2E Member ${i}`,
        },
      });
      testUsers.push(user);
    }

    // Create test team
    testTeam = await prisma.team.create({
      data: {
        name: `HWM E2E Team ${TEST_PREFIX}`,
        slug: TEST_PREFIX,
        isOrganization: false,
      },
    });

    // Add all users as members
    await prisma.membership.create({
      data: {
        userId: adminUser.id,
        teamId: testTeam.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    for (let i = 1; i < testUsers.length; i++) {
      await prisma.membership.create({
        data: {
          userId: testUsers[i].id,
          teamId: testTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });
    }

    // Create Stripe test clock
    testClock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: `HWM E2E Test ${TEST_PREFIX}`,
    });

    // Create Stripe customer attached to test clock
    customer = await stripe.customers.create({
      email: `${TEST_PREFIX}-admin@example.com`,
      name: `HWM E2E Team ${TEST_PREFIX}`,
      test_clock: testClock.id,
      metadata: {
        testData: "true",
        teamId: testTeam.id.toString(),
      },
    });

    // Add payment method
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

    // Create subscription with 4 seats (current member count)
    const currentMemberCount = 4;
    const peakMemberCount = 6; // At peak, had 6 members

    subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        { price: STRIPE_TEAM_MONTHLY_PRICE_ID!, quantity: currentMemberCount },
      ],
      metadata: {
        testData: "true",
        teamId: testTeam.id.toString(),
      },
    });

    // Create TeamBilling with HWM higher than current members (simulating members who left)
    await prisma.teamBilling.create({
      data: {
        teamId: testTeam.id,
        customerId: customer.id,
        subscriptionId: subscription.id,
        subscriptionItemId: subscription.items.data[0].id,
        billingPeriod: BillingPeriod.MONTHLY,
        pricePerSeat: 699, // $6.99
        paidSeats: currentMemberCount,
        subscriptionStart: new Date(subscription.current_period_start * 1000),
        subscriptionEnd: new Date(subscription.current_period_end * 1000),
        status: "ACTIVE",
        planName: "TEAM",
        highWaterMark: peakMemberCount,
        highWaterMarkPeriodStart: new Date(
          subscription.current_period_start * 1000
        ),
      },
    });

    console.log("\n=== E2E Test Setup Complete ===");
    console.log(`Team ID: ${testTeam.id}`);
    console.log(`Current Members: ${currentMemberCount}`);
    console.log(`HWM (Peak): ${peakMemberCount}`);
    console.log(`Subscription: ${subscription.id}`);
    console.log(`Test Clock: ${testClock.id}`);
    console.log(
      `Period End: ${new Date(
        subscription.current_period_end * 1000
      ).toISOString()}`
    );
  });

  afterAll(async () => {
    // Cleanup Stripe resources
    try {
      if (testClock) {
        await stripe.testHelpers.testClocks.del(testClock.id);
        console.log(`Deleted test clock: ${testClock.id}`);
      }
    } catch (error) {
      console.log("Could not delete test clock:", error);
    }

    // Cleanup database
    if (testTeam) {
      await prisma.seatChangeLog.deleteMany({ where: { teamId: testTeam.id } });
      await prisma.teamBilling.deleteMany({ where: { teamId: testTeam.id } });
      await prisma.membership.deleteMany({ where: { teamId: testTeam.id } });
      await prisma.team.delete({ where: { id: testTeam.id } });
    }

    for (const user of testUsers) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }

    console.log("E2E Test cleanup complete");
  });

  async function waitForClockAdvancement(
    clockId: string,
    maxWaitMs = 60000
  ): Promise<void> {
    const startTime = Date.now();
    const pollIntervalMs = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      const clock = await stripe.testHelpers.testClocks.retrieve(clockId);

      if (clock.status === "ready") {
        console.log(
          `Test clock ready at: ${new Date(
            clock.frozen_time * 1000
          ).toISOString()}`
        );
        return;
      }

      if (clock.status === "advancing") {
        console.log(
          `Clock still advancing... (${Math.round(
            (Date.now() - startTime) / 1000
          )}s elapsed)`
        );
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      throw new Error(`Unexpected clock status: ${clock.status}`);
    }

    throw new Error(`Clock advancement timed out after ${maxWaitMs}ms`);
  }

  async function waitForDatabaseUpdate(
    check: () => Promise<boolean>,
    description: string,
    maxWaitMs = 30000
  ): Promise<void> {
    const startTime = Date.now();
    const pollIntervalMs = 1000;

    while (Date.now() - startTime < maxWaitMs) {
      if (await check()) {
        console.log(`${description} - confirmed`);
        return;
      }

      console.log(
        `Waiting for ${description}... (${Math.round(
          (Date.now() - startTime) / 1000
        )}s elapsed)`
      );
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timed out waiting for: ${description}`);
  }

  it("should scale UP subscription quantity to HWM on invoice.upcoming", async () => {
    // Get initial state
    const initialBilling = await prisma.teamBilling.findUnique({
      where: { teamId: testTeam.id },
      select: { paidSeats: true, highWaterMark: true },
    });

    console.log("\n=== Step 1: Advance clock to trigger invoice.upcoming ===");
    console.log(
      `Initial state: paidSeats=${initialBilling?.paidSeats}, HWM=${initialBilling?.highWaterMark}`
    );

    // Note: For scale-up test, we start with qty=4, paidSeats=4, HWM=6
    // But our setup now creates qty=6, paidSeats=6 for scale-down test
    // So we need to reset to initial state for scale-up test
    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: subscription.items.data[0].id, quantity: 4 }],
    });
    await prisma.teamBilling.update({
      where: { teamId: testTeam.id },
      data: { paidSeats: 4 },
    });

    const resetBilling = await prisma.teamBilling.findUnique({
      where: { teamId: testTeam.id },
      select: { paidSeats: true, highWaterMark: true },
    });
    console.log(
      `Reset state: paidSeats=${resetBilling?.paidSeats}, HWM=${resetBilling?.highWaterMark}`
    );

    expect(resetBilling?.paidSeats).toBe(4);
    expect(resetBilling?.highWaterMark).toBe(6);

    // Advance clock to 3 days before period end (triggers invoice.upcoming)
    const invoiceUpcomingTime =
      subscription.current_period_end - 3 * 24 * 60 * 60;
    console.log(
      `Advancing clock to: ${new Date(
        invoiceUpcomingTime * 1000
      ).toISOString()}`
    );

    await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: invoiceUpcomingTime,
    });

    // Wait for clock to finish advancing
    await waitForClockAdvancement(testClock.id);

    // The webhook fires during clock advancement but fails because Stripe blocks
    // modifications while advancing. Now that clock is ready, manually trigger scale-up.
    console.log(
      "\\nManually triggering scale-up (webhook fails during clock advancement)..."
    );

    const billingService = new StripeBillingService(stripe);
    const hwmService = new HighWaterMarkService({
      logger: logger.getSubLogger({ prefix: ["hwm-test"] }),
      billingService,
    });

    await hwmService.applyHighWaterMarkToSubscription(subscription.id);

    // Verify Stripe subscription was updated
    const updatedSub = await stripe.subscriptions.retrieve(subscription.id);
    expect(updatedSub.items.data[0].quantity).toBe(6);

    // Verify DB was updated
    const updatedBilling = await prisma.teamBilling.findUnique({
      where: { teamId: testTeam.id },
      select: { paidSeats: true },
    });
    expect(updatedBilling?.paidSeats).toBe(6);

    console.log("Scale UP verified: subscription quantity = 6 (HWM)");
  }, 120000); // 2 minute timeout

  it("should scale DOWN subscription quantity to current members after renewal", async () => {
    console.log(
      "\n=== Step 2: Advance clock past renewal to trigger scale down ==="
    );

    // Get the updated subscription (period may have changed)
    const currentSub = await stripe.subscriptions.retrieve(subscription.id);
    const periodEnd = currentSub.current_period_end;

    // Advance clock past the billing period end (triggers renewal + subscription.updated)
    const renewalTime = periodEnd + 60; // 1 minute after period end
    console.log(
      `Current period end: ${new Date(periodEnd * 1000).toISOString()}`
    );
    console.log(
      `Advancing clock to: ${new Date(renewalTime * 1000).toISOString()}`
    );

    await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: renewalTime,
    });

    // Wait for clock to finish advancing
    await waitForClockAdvancement(testClock.id);

    // Debug: Check state immediately after clock advancement
    const subAfterRenewal = await stripe.subscriptions.retrieve(
      subscription.id
    );
    console.log("Stripe subscription after renewal:");
    console.log(`  - Status: ${subAfterRenewal.status}`);
    console.log(`  - Quantity: ${subAfterRenewal.items.data[0].quantity}`);
    console.log(
      `  - Period: ${new Date(
        subAfterRenewal.current_period_start * 1000
      ).toISOString()} to ${new Date(
        subAfterRenewal.current_period_end * 1000
      ).toISOString()}`
    );

    const billingAfterRenewal = await prisma.teamBilling.findUnique({
      where: { teamId: testTeam.id },
      select: { paidSeats: true, highWaterMark: true },
    });
    console.log("Database after clock advancement:");
    console.log(`  - paidSeats: ${billingAfterRenewal?.paidSeats}`);
    console.log(`  - HWM: ${billingAfterRenewal?.highWaterMark}`);

    // The webhook fires during clock advancement but fails because Stripe blocks
    // modifications while advancing. Now that clock is ready, manually trigger reset.
    // This simulates what would happen if we had retry logic or a separate job.
    console.log(
      "\\nManually triggering reset (webhook fails during clock advancement)..."
    );

    const billingService = new StripeBillingService(stripe);
    const hwmService = new HighWaterMarkService({
      logger: logger.getSubLogger({ prefix: ["hwm-test"] }),
      billingService,
    });

    const newPeriodStart = new Date(
      subAfterRenewal.current_period_start * 1000
    );
    await hwmService.resetSubscriptionAfterRenewal({
      subscriptionId: subscription.id,
      newPeriodStart,
    });

    console.log("Reset completed, verifying results...");

    // Verify HWM was also reset
    const billing = await prisma.teamBilling.findUnique({
      where: { teamId: testTeam.id },
      select: { paidSeats: true, highWaterMark: true },
    });

    expect(billing?.paidSeats).toBe(4);
    expect(billing?.highWaterMark).toBe(4);

    // Verify Stripe subscription was updated
    const updatedSub = await stripe.subscriptions.retrieve(subscription.id);
    expect(updatedSub.items.data[0].quantity).toBe(4);

    console.log(
      "Scale DOWN verified: subscription quantity = 4 (current members)"
    );
    console.log(
      `Final state: paidSeats=${billing?.paidSeats}, HWM=${billing?.highWaterMark}`
    );
  }, 180000); // 3 minute timeout
});
