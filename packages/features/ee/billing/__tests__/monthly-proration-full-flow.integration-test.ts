import process from "node:process";
import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPeriodService } from "../service/billingPeriod/BillingPeriodService";
import { MonthlyProrationService } from "../service/proration/MonthlyProrationService";
import { SeatChangeTrackingService } from "../service/seatTracking/SeatChangeTrackingService";

/**
 * Integration test for monthly proration flow using real Stripe test resources.
 * Requires STRIPE_PRIVATE_KEY environment variable with test key (sk_test_...).
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_PRIVATE_KEY || "";

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  throw new Error("STRIPE_PRIVATE_KEY must be set to a test key (sk_test_...) for integration tests");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

describe("Monthly Proration - Full Integration Flow", () => {
  let testUser: User;
  let testTeam: Team;
  let stripeCustomer: Stripe.Customer;
  let stripeProduct: Stripe.Product;
  let stripePrice: Stripe.Price;
  let stripeSubscription: Stripe.Subscription;

  const getPreviousMonthKey = () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = previousMonth.getFullYear();
    const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const monthKey = getPreviousMonthKey();

  beforeEach(async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    await prisma.feature.upsert({
      where: { slug: "monthly-proration" },
      create: {
        slug: "monthly-proration",
        enabled: true,
        description: "Monthly proration billing feature",
        type: "RELEASE",
      },
      update: {
        enabled: true,
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: `test-full-flow-${timestamp}-${randomSuffix}@example.com`,
        username: `testfullflow-${timestamp}-${randomSuffix}`,
        name: "Test Full Flow User",
      },
    });

    testTeam = await prisma.team.create({
      data: {
        name: `Test Full Flow Team ${timestamp}-${randomSuffix}`,
        slug: `test-full-flow-team-${timestamp}-${randomSuffix}`,
        isOrganization: false,
      },
    });

    await prisma.membership.create({
      data: {
        userId: testUser.id,
        teamId: testTeam.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    console.log("Creating Stripe test resources...");

    // 1. Create customer
    stripeCustomer = await stripe.customers.create({
      email: testUser.email,
      name: testUser.name || undefined,
      metadata: {
        teamId: testTeam.id.toString(),
        environment: "test",
      },
    });
    console.log(`Created Stripe customer: ${stripeCustomer.id}`);

    // 2. Create product
    stripeProduct = await stripe.products.create({
      name: "Cal.com Team Plan (Test)",
      description: "Test product for integration tests",
      metadata: {
        environment: "test",
      },
    });
    console.log(`Created Stripe product: ${stripeProduct.id}`);

    // 3. Create annual price ($120/year per seat)
    stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: 12000, // $120.00
      currency: "usd",
      recurring: {
        interval: "year",
      },
      metadata: {
        environment: "test",
      },
    });
    console.log(`Created Stripe price: ${stripePrice.id}`);

    // 4. Attach test payment method to customer
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        token: "tok_visa", // Stripe test token
      },
    });
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: stripeCustomer.id,
    });
    await stripe.customers.update(stripeCustomer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });
    console.log(`Attached payment method: ${paymentMethod.id}`);

    // 5. Create subscription with 5 seats (no trial period)
    // Subscription will start now and run for a year
    stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [
        {
          price: stripePrice.id,
          quantity: 5,
        },
      ],
      metadata: {
        teamId: testTeam.id.toString(),
        environment: "test",
      },
    });
    console.log(`Created Stripe subscription: ${stripeSubscription.id}`);

    // 6. Create TeamBilling record
    const subscriptionStart = new Date(stripeSubscription.current_period_start * 1000);
    const subscriptionEnd = new Date(stripeSubscription.current_period_end * 1000);
    const subscriptionTrialEnd = stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null;

    await prisma.teamBilling.create({
      data: {
        teamId: testTeam.id,
        subscriptionId: stripeSubscription.id,
        subscriptionItemId: stripeSubscription.items.data[0].id,
        customerId: stripeCustomer.id,
        status: "ACTIVE",
        planName: "TEAM",
        billingPeriod: "ANNUALLY",
        pricePerSeat: 120.0,
        subscriptionStart,
        subscriptionEnd,
        subscriptionTrialEnd,
      },
    });

    console.log("Test setup complete!");
  });

  afterEach(async () => {
    console.log("Cleaning up test resources...");

    try {
      if (testTeam) {
        const memberships = await prisma.membership.findMany({
          where: { teamId: testTeam.id },
          select: { userId: true },
        });
        const userIds = memberships.map((m) => m.userId);

        await prisma.seatChangeLog.deleteMany({ where: { teamId: testTeam.id } });
        await prisma.monthlyProration.deleteMany({ where: { teamId: testTeam.id } });
        await prisma.teamBilling.deleteMany({ where: { teamId: testTeam.id } });
        await prisma.membership.deleteMany({ where: { teamId: testTeam.id } });
        await prisma.team.delete({ where: { id: testTeam.id } });
        console.log(`Deleted team and related data: ${testTeam.id}`);

        if (userIds.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: userIds } } });
          console.log(`Deleted ${userIds.length} users`);
        }
      }
    } catch (error) {
      console.error("Failed to delete team data:", error);
    }

    try {
      if (stripeSubscription) {
        await stripe.subscriptions.cancel(stripeSubscription.id);
        console.log(`Cancelled subscription: ${stripeSubscription.id}`);
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }

    try {
      if (stripeCustomer) {
        await stripe.customers.del(stripeCustomer.id);
        console.log(`Deleted customer: ${stripeCustomer.id}`);
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
    }

    try {
      if (stripePrice) {
        await stripe.prices.update(stripePrice.id, { active: false });
        console.log(`Deactivated price: ${stripePrice.id}`);
      }
    } catch (error) {
      console.error("Failed to deactivate price:", error);
    }

    try {
      if (stripeProduct) {
        await stripe.products.update(stripeProduct.id, { active: false });
        console.log(`Deactivated product: ${stripeProduct.id}`);
      }
    } catch (error) {
      console.error("Failed to deactivate product:", error);
    }
  });

  it("should complete full end-to-end proration flow", async () => {
    console.log("\n=== Starting Full E2E Test ===\n");

    console.log("Step 1: Checking eligibility...");
    const billingPeriodService = new BillingPeriodService();
    const isAnnual = await billingPeriodService.isAnnualPlan(testTeam.id);
    const isInTrial = await billingPeriodService.isInTrialPeriod(testTeam.id);

    expect(isAnnual).toBe(true);
    expect(isInTrial).toBe(false);
    console.log("✓ Team is on annual plan and not in trial");

    console.log("\nStep 2: Adding 3 seats...");
    const seatTracker = new SeatChangeTrackingService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 3,
      monthKey,
    });

    const seatChangesAfterAdd = await prisma.seatChangeLog.findMany({
      where: { teamId: testTeam.id, monthKey },
    });
    expect(seatChangesAfterAdd).toHaveLength(1);
    expect(seatChangesAfterAdd[0].changeType).toBe("ADDITION");
    expect(seatChangesAfterAdd[0].seatCount).toBe(3);
    console.log("✓ 3 seat additions logged");

    console.log("\nStep 3: Removing 1 seat...");
    await seatTracker.logSeatRemoval({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 1,
      monthKey,
    });

    const seatChangesAfterRemove = await prisma.seatChangeLog.findMany({
      where: { teamId: testTeam.id, monthKey },
    });
    expect(seatChangesAfterRemove).toHaveLength(2);
    console.log("✓ 1 seat removal logged");

    console.log("\nStep 4: Calculating monthly changes...");
    const changes = await seatTracker.getMonthlyChanges({
      teamId: testTeam.id,
      monthKey,
    });

    expect(changes.additions).toBe(3);
    expect(changes.removals).toBe(1);
    expect(changes.netChange).toBe(2);
    console.log(
      `✓ Net change: +${changes.netChange} seats (${changes.additions} added, ${changes.removals} removed)`
    );

    console.log("\nStep 5: Creating proration...");
    const prorationService = new MonthlyProrationService();
    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeDefined();
    expect(proration?.netSeatIncrease).toBe(2);
    expect(proration?.seatsAdded).toBe(3);
    expect(proration?.seatsRemoved).toBe(1);

    // Note: Since we're testing with the current month, the proration calculation
    // may result in 0 amount (month hasn't ended yet). This test verifies the
    // mechanics work correctly. In production, this runs on the 1st of the next month.
    expect(proration?.status).toBe("PENDING"); // Will be PENDING when amount is 0
    console.log(`✓ Proration record created`);

    console.log("\nStep 7: Verifying seat change logs...");
    const processedLogs = await prisma.seatChangeLog.findMany({
      where: {
        teamId: testTeam.id,
        monthKey,
        processedInProrationId: proration!.id,
      },
    });
    expect(processedLogs).toHaveLength(2);
    console.log("✓ All seat change logs marked as processed");

    console.log("\nStep 8: Simulating payment success...");
    await prorationService.handleProrationPaymentSuccess(proration!.id);

    const updatedProration = await prisma.monthlyProration.findUnique({
      where: { id: proration!.id },
    });
    expect(updatedProration?.status).toBe("CHARGED");
    expect(updatedProration?.chargedAt).toBeDefined();
    console.log("✓ Proration marked as CHARGED");

    console.log("\nStep 9: Verifying idempotency...");
    const duplicateProration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });
    expect(duplicateProration).toBeNull();
    console.log("✓ Duplicate proration correctly skipped (net change = 0)");

    console.log("\n=== Full E2E Test Complete ===\n");
  });

  it("should handle payment failure and retry", async () => {
    console.log("\n=== Starting Payment Failure Test ===\n");

    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });

    // Create proration
    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeDefined();
    expect(proration?.status).toBe("PENDING");
    console.log("✓ Proration created");

    await prisma.monthlyProration.update({
      where: { id: proration!.id },
      data: { status: "INVOICE_CREATED" },
    });

    await prorationService.handleProrationPaymentFailure({
      prorationId: proration!.id,
      reason: "card_declined",
    });

    const failedProration = await prisma.monthlyProration.findUnique({
      where: { id: proration!.id },
    });

    expect(failedProration?.status).toBe("FAILED");
    expect(failedProration?.failureReason).toBe("card_declined");
    expect(failedProration?.retryCount).toBe(1);
    console.log("✓ Payment failure handled correctly");

    console.log("\n=== Payment Failure Test Complete ===\n");
  });

  it("should skip proration for teams with no net change", async () => {
    console.log("\n=== Starting No Net Change Test ===\n");

    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 3,
      monthKey,
    });

    await seatTracker.logSeatRemoval({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 3,
      monthKey,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeNull();
    console.log("✓ Proration correctly skipped (net change = 0)");

    const prorationRecords = await prisma.monthlyProration.findMany({
      where: { teamId: testTeam.id, monthKey },
    });

    expect(prorationRecords).toHaveLength(0);
    console.log("✓ No proration record created");

    console.log("\n=== No Net Change Test Complete ===\n");
  });

  it("should work with team metadata fallback when TeamBilling doesn't exist", async () => {
    console.log("\n=== Starting Metadata Fallback Test ===\n");

    // This test simulates the prod scenario where an existing team
    // has billing info in metadata but no TeamBilling record yet.
    // The service should lazy-load from Stripe and create the record.

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    const metadataTestUser = await prisma.user.create({
      data: {
        email: `test-metadata-${timestamp}-${randomSuffix}@example.com`,
        username: `testmetadata-${timestamp}-${randomSuffix}`,
        name: "Test Metadata User",
      },
    });

    const metadataSubscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [
        {
          price: stripePrice.id,
          quantity: 3,
        },
      ],
      metadata: {
        environment: "test",
        testType: "metadata-fallback",
      },
    });
    console.log(`Created separate subscription: ${metadataSubscription.id}`);

    const metadataTestTeam = await prisma.team.create({
      data: {
        name: `Test Metadata Team ${timestamp}-${randomSuffix}`,
        slug: `test-metadata-team-${timestamp}-${randomSuffix}`,
        isOrganization: false,
        metadata: {
          subscriptionId: metadataSubscription.id,
          subscriptionItemId: metadataSubscription.items.data[0].id,
          paymentId: stripeCustomer.id,
        },
      },
    });

    await prisma.membership.create({
      data: {
        userId: metadataTestUser.id,
        teamId: metadataTestTeam.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    console.log("✓ Team created with metadata only (no TeamBilling record)");

    const existingBilling = await prisma.teamBilling.findUnique({
      where: { teamId: metadataTestTeam.id },
    });
    expect(existingBilling).toBeNull();
    console.log("✓ Confirmed no TeamBilling record exists");

    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService();

    // Add seats for this team
    await seatTracker.logSeatAddition({
      teamId: metadataTestTeam.id,
      userId: metadataTestUser.id,
      triggeredBy: metadataTestUser.id,
      seatCount: 2,
      monthKey,
    });

    console.log("✓ Seat changes logged");

    // Create proration - should lazy-load from Stripe via metadata
    const proration = await prorationService.createProrationForTeam({
      teamId: metadataTestTeam.id,
      monthKey,
    });

    expect(proration).toBeDefined();
    expect(proration?.netSeatIncrease).toBe(2);
    expect(proration?.seatsAdded).toBe(2);
    expect(proration?.subscriptionId).toBe(metadataSubscription.id);
    expect(proration?.customerId).toBe(stripeCustomer.id);
    console.log("✓ Proration created successfully using metadata fallback");

    // Verify TeamBilling record was created during lazy loading
    const createdBilling = await prisma.teamBilling.findUnique({
      where: { teamId: metadataTestTeam.id },
    });
    expect(createdBilling).toBeDefined();
    expect(createdBilling?.subscriptionId).toBe(metadataSubscription.id);
    expect(createdBilling?.customerId).toBe(stripeCustomer.id);
    expect(createdBilling?.billingPeriod).toBe("ANNUALLY");
    expect(createdBilling?.pricePerSeat).toBeGreaterThan(0);
    console.log("✓ TeamBilling record created via lazy loading");
    console.log(`  - Billing period: ${createdBilling?.billingPeriod}`);
    console.log(`  - Price per seat: $${createdBilling?.pricePerSeat}`);

    try {
      await stripe.subscriptions.cancel(metadataSubscription.id);
      console.log(`✓ Cleaned up test subscription: ${metadataSubscription.id}`);
    } catch (error) {
      console.error("Failed to cancel metadata test subscription:", error);
    }

    try {
      await prisma.seatChangeLog.deleteMany({ where: { teamId: metadataTestTeam.id } });
      await prisma.monthlyProration.deleteMany({ where: { teamId: metadataTestTeam.id } });
      await prisma.teamBilling.deleteMany({ where: { teamId: metadataTestTeam.id } });
      await prisma.membership.deleteMany({ where: { teamId: metadataTestTeam.id } });
      await prisma.team.delete({ where: { id: metadataTestTeam.id } });
      await prisma.user.delete({ where: { id: metadataTestUser.id } });
      console.log(`✓ Cleaned up metadata test team and user`);
    } catch (error) {
      console.error("Failed to cleanup metadata test data:", error);
    }

    console.log("\n=== Metadata Fallback Test Complete ===\n");
  });

  it("should update subscription quantity after proration is charged", async () => {
    console.log("\n=== Starting Subscription Quantity Update Test ===\n");

    console.log("Step 1: Get initial subscription quantity...");
    const initialSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id);
    const initialQuantity = initialSubscription.items.data[0].quantity;
    expect(initialQuantity).toBe(5);
    console.log(`✓ Initial subscription quantity: ${initialQuantity} seats`);

    // Get current member count (should be 1 - just the owner)
    const initialMemberCount = await prisma.membership.count({
      where: { teamId: testTeam.id },
    });
    console.log(`  Current membership count: ${initialMemberCount}`);

    console.log("\nStep 2: Add 3 actual members to the team...");
    const seatTracker = new SeatChangeTrackingService();

    // Create 3 new users and add them as members
    for (let i = 0; i < 3; i++) {
      const newUser = await prisma.user.create({
        data: {
          email: `test-member-${Date.now()}-${i}@example.com`,
          username: `testmember-${Date.now()}-${i}`,
          name: `Test Member ${i + 1}`,
        },
      });

      await prisma.membership.create({
        data: {
          userId: newUser.id,
          teamId: testTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      // Log the seat addition
      await seatTracker.logSeatAddition({
        teamId: testTeam.id,
        userId: newUser.id,
        triggeredBy: testUser.id,
        seatCount: 1,
        monthKey,
      });
    }

    const finalMemberCount = await prisma.membership.count({
      where: { teamId: testTeam.id },
    });
    console.log(`✓ Added 3 members. New count: ${finalMemberCount}`);

    console.log("\nStep 3: Verify subscription quantity is NOT updated immediately...");
    const subscriptionAfterAdd = await stripe.subscriptions.retrieve(stripeSubscription.id);
    const quantityAfterAdd = subscriptionAfterAdd.items.data[0].quantity;
    expect(quantityAfterAdd).toBe(5); // Should still be 5, not 4 (1 initial member + 3 added)
    console.log(`✓ Subscription quantity unchanged: ${quantityAfterAdd} seats (expected behavior)`);

    console.log("\nStep 4: Process monthly proration...");
    const prorationService = new MonthlyProrationService();
    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });
    expect(proration).toBeDefined();
    expect(proration?.netSeatIncrease).toBe(3);
    console.log(`✓ Proration created for ${proration?.netSeatIncrease} net seats`);

    console.log("\nStep 5: Mark proration as charged...");
    await prorationService.handleProrationPaymentSuccess(proration!.id);
    console.log("✓ Proration payment successful");

    console.log("\nStep 6: Verify subscription quantity is NOW updated to new total...");
    const finalSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id);
    const finalQuantity = finalSubscription.items.data[0].quantity;

    expect(finalQuantity).toBe(4);
    console.log(`✓ Subscription quantity updated: ${initialQuantity} → ${finalQuantity} seats`);

    console.log("\nStep 7: Verify subsequent renewals will use correct quantity...");
    expect(finalSubscription.items.data[0].quantity).toBe(4);
    console.log("✓ Next annual renewal will charge for 4 seats");

    console.log("\n=== Subscription Quantity Update Test Complete ===\n");
  });

  it("should not charge for seat removals on annual plans", async () => {
    console.log("\n=== Starting Seat Removal Test ===\n");

    console.log("Step 1: Start with 5 seats on annual plan...");
    const initialSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id);
    const initialQuantity = initialSubscription.items.data[0].quantity;
    expect(initialQuantity).toBe(5);
    console.log(`✓ Initial subscription quantity: ${initialQuantity} seats`);

    console.log("\nStep 2: Add 3 seats, then remove 5 (net: -2)...");
    const seatTracker = new SeatChangeTrackingService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 3,
      monthKey,
    });

    await seatTracker.logSeatRemoval({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 5,
      monthKey,
    });
    console.log("✓ Logged 3 additions and 5 removals");

    console.log("\nStep 3: Calculate monthly changes...");
    const changes = await seatTracker.getMonthlyChanges({
      teamId: testTeam.id,
      monthKey,
    });

    expect(changes.additions).toBe(3);
    expect(changes.removals).toBe(5);
    expect(changes.netChange).toBe(0);
    console.log(`✓ Net change capped at 0 (${changes.additions} added, ${changes.removals} removed)`);

    console.log("\nStep 4: Create proration record (no charge, but tracks the change)...");
    const prorationService = new MonthlyProrationService();
    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeDefined();
    expect(proration?.netSeatIncrease).toBe(0);
    expect(proration?.proratedAmount).toBe(0);
    expect(proration?.status).toBe("CHARGED");
    console.log("✓ Proration record created with $0 charge (no credit issued)");

    console.log("\nStep 5: Verify subscription quantity updated to actual member count...");
    const finalSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id);
    const finalQuantity = finalSubscription.items.data[0].quantity;

    // Subscription should be updated to 1 (the actual member count)
    // since we started with 1 member, added 3 (= 4), then removed 5 (= -1, but can't go negative)
    // So actual member count is max(0, 1 + 3 - 5) = 1
    const finalMemberCount = await prisma.membership.count({
      where: { teamId: testTeam.id },
    });
    expect(finalQuantity).toBe(finalMemberCount);
    console.log(`✓ Subscription quantity updated to ${finalQuantity} seats (actual member count)`);

    console.log("\n✓ Seat removals tracked but no credit issued for annual plans");
    console.log("✓ Subscription quantity updated to reflect actual member count for next renewal");

    console.log("\n=== Seat Removal Test Complete ===\n");
  });

  it("should use high-water mark (paidSeats) to prevent double-charging", async () => {
    console.log("\n=== Starting High-Water Mark Test ===\n");

    console.log("Step 1: Initial state - paid for 5 seats...");
    const initialSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id);
    const initialQuantity = initialSubscription.items.data[0].quantity;
    expect(initialQuantity).toBe(5);
    const paidSeats = initialQuantity;
    console.log(`✓ paidSeats = ${paidSeats} (what they originally paid for)`);

    console.log("\nStep 2: Remove 2 seats (now at 3 members, but still paid for 5)...");
    const seatTracker = new SeatChangeTrackingService();
    await seatTracker.logSeatRemoval({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });
    console.log("✓ Removed 2 seats");

    console.log("\nStep 3: Add 2 seats back (back to 5 members)...");
    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });
    console.log("✓ Added 2 seats back");

    console.log("\nStep 4: Process proration...");
    const prorationService = new MonthlyProrationService();
    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeDefined();
    // chargeableSeats = currentMembers(1) - paidSeats(5) = max(0, -4) = 0
    expect(proration?.netSeatIncrease).toBe(0);
    expect(proration?.proratedAmount).toBe(0);
    console.log(`✓ No charge (chargeableSeats = max(0, 1 - ${paidSeats}) = 0)`);

    console.log("\n✓ High-water mark prevents charging for seats already paid for");
    console.log("✓ User can remove and re-add seats without penalty");

    console.log("\n=== High-Water Mark Test Complete ===\n");
  });
});
