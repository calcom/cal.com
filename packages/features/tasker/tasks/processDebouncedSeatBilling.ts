import { z } from "zod";

import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import stripe from "@calcom/features/ee/payments/server/stripe";
import prisma from "@calcom/prisma";

export const ProcessDebouncedSeatBillingSchema = z.object({
  teamId: z.number(),
  previousSeatCount: z.number(),
  currentSeatCount: z.number(),
});

export async function processDebouncedSeatBilling(payload: string): Promise<void> {
  try {
    const parsedPayload = JSON.parse(payload);
    const { teamId, previousSeatCount, currentSeatCount } =
      ProcessDebouncedSeatBillingSchema.parse(parsedPayload);

    console.log(`Processing debounced seat billing for team ${teamId}`);

    if (currentSeatCount <= previousSeatCount) {
      console.log(`No seat increase for team ${teamId}, skipping billing`);
      return;
    }

    const additionalSeats = currentSeatCount - previousSeatCount;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        metadata: true,
      },
    });

    if (!team) {
      console.error(`Team ${teamId} not found`);
      return;
    }

    const metadata = team.metadata as Record<string, any>;

    if (!metadata.subscriptionId || !metadata.subscriptionItemId) {
      console.error(`Team ${teamId} has no subscription information`);
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(metadata.subscriptionId);
    const subscriptionItem = subscription.items.data.find((item) => item.id === metadata.subscriptionItemId);

    if (!subscriptionItem || !subscription.customer) {
      console.error(`Invalid subscription data for team ${teamId}`);
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const periodEnd = subscription.current_period_end;
    const periodStart = subscription.current_period_start;
    const totalCycleTime = periodEnd - periodStart;
    const timeRemaining = periodEnd - currentTime;

    if (timeRemaining <= 0 || totalCycleTime <= 0) {
      console.log(`No time remaining in billing cycle for team ${teamId}, skipping billing`);
      return;
    }

    const prorationFactor = timeRemaining / totalCycleTime;
    const pricePerSeat = subscriptionItem.price.unit_amount || 0;
    const proratedAmount = Math.round(pricePerSeat * additionalSeats * prorationFactor);

    if (proratedAmount <= 0) {
      console.log(`Prorated amount is zero for team ${teamId}, skipping billing`);
      return;
    }

    const billingService = new StripeBillingService();
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

    await billingService.createInvoiceItem({
      customerId,
      subscriptionId: metadata.subscriptionId,
      amount: proratedAmount,
      description: `Prorated charge for ${additionalSeats} additional seat(s)`,
      metadata: {
        teamId,
        additionalSeats,
        prorationFactor: prorationFactor.toFixed(4),
      },
    });

    await prisma.team.update({
      where: { id: teamId },
      data: {
        metadata: {
          ...metadata,
          debouncedBillingTaskId: null,
        },
      },
    });

    console.log(`Created invoice item for team ${teamId} for ${additionalSeats} additional seats`);
  } catch (error) {
    console.error("Error in processDebouncedSeatBilling:", error);
  }
}
