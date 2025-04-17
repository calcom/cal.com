import { z } from "zod";

import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import stripe from "@calcom/features/ee/payments/server/stripe";
import tasker from "@calcom/features/tasker";
import prisma from "@calcom/prisma";

export const ProcessDebouncedSeatBillingSchema = z.object({});

const DEBOUNCE_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export async function processDebouncedSeatBilling(payload: string): Promise<void> {
  try {
    console.log("Processing debounced seat billing");
    const parsedPayload = JSON.parse(payload);

    const cutoffTime = new Date(Date.now() - DEBOUNCE_INTERVAL_MS);

    const teams = await prisma.team.findMany({
      where: {
        metadata: {
          path: ["lastSeatChangeAt"],
          not: undefined,
        },
      },
      select: {
        id: true,
        metadata: true,
        members: {
          select: {
            id: true,
          },
        },
        createdAt: true,
      },
    });

    const teamsWithRecentChanges = teams.filter((team) => {
      const metadata = team.metadata as Record<string, any>;
      if (!metadata.lastSeatChangeAt) return false;

      const lastChangeDate =
        typeof metadata.lastSeatChangeAt === "string"
          ? new Date(metadata.lastSeatChangeAt)
          : metadata.lastSeatChangeAt;

      return lastChangeDate > cutoffTime;
    });

    for (const team of teamsWithRecentChanges) {
      try {
        const metadata = team.metadata as Record<string, any>;

        if (!metadata.subscriptionId || !metadata.subscriptionItemId) {
          continue;
        }

        const currentSeatCount = team.members.length;
        const lastInvoicedSeatCount = metadata.lastInvoicedSeatCount || currentSeatCount;

        if (currentSeatCount <= lastInvoicedSeatCount) {
          continue;
        }

        const additionalSeats = currentSeatCount - lastInvoicedSeatCount;

        const subscription = await stripe.subscriptions.retrieve(metadata.subscriptionId);
        const subscriptionItem = subscription.items.data.find(
          (item) => item.id === metadata.subscriptionItemId
        );

        if (!subscriptionItem || !subscription.customer) {
          continue;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const periodEnd = subscription.current_period_end;
        const periodStart = subscription.current_period_start;
        const totalCycleTime = periodEnd - periodStart;
        const timeRemaining = periodEnd - currentTime;

        if (timeRemaining <= 0 || totalCycleTime <= 0) {
          continue;
        }

        const prorationFactor = timeRemaining / totalCycleTime;

        const pricePerSeat = subscriptionItem.price.unit_amount || 0;

        const proratedAmount = Math.round(pricePerSeat * additionalSeats * prorationFactor);

        if (proratedAmount <= 0) {
          continue;
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
            teamId: team.id,
            additionalSeats,
            prorationFactor: prorationFactor.toFixed(4),
          },
        });

        await prisma.team.update({
          where: { id: team.id },
          data: {
            metadata: {
              ...metadata,
              lastInvoicedSeatCount: currentSeatCount,
            },
          },
        });

        console.log(`Created invoice item for team ${team.id} for ${additionalSeats} additional seats`);
      } catch (error) {
        console.error(`Error processing team ${team.id}:`, error);
      }
    }

    await tasker.create(
      "processDebouncedSeatBilling",
      {},
      {
        scheduledAt: new Date(Date.now() + DEBOUNCE_INTERVAL_MS),
      }
    );

    console.log("Debounced seat billing completed, scheduled next run");
  } catch (error) {
    console.error("Error in processDebouncedSeatBilling:", error);

    try {
      await tasker.create(
        "processDebouncedSeatBilling",
        {},
        {
          scheduledAt: new Date(Date.now() + DEBOUNCE_INTERVAL_MS),
        }
      );
    } catch (scheduleError) {
      console.error("Failed to schedule next run:", scheduleError);
    }
  }
}
