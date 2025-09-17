import { z } from "zod";

import {
  getOrCreateStripePrice,
  generatePaymentMetadata,
} from "@calcom/app-store/stripepayment/lib/variablePricing";
import logger from "@calcom/lib/logger";
import { calculateVariablePrice } from "@calcom/lib/pricing/calculator";
import type { PricingContext } from "@calcom/lib/pricing/types";
import { getVariablePricingConfig } from "@calcom/lib/pricing/utils";
import type { EventType } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

// Logger
const log = logger.getSubLogger({ prefix: ["stripepayment:variablePricing"] });

// Input schema for calculating price for Stripe
const calculatePriceForStripeSchema = z.object({
  eventTypeId: z.number().int(),
  formValues: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
  duration: z.number().int(), // in minutes
  startTime: z.string(), // ISO date string
  endTime: z.string(), // ISO date string
  stripeAccountId: z.string(),
});

export const stripeVariablePricingRouter = router({
  /**
   * Calculate price and create or reuse a Stripe price object
   */
  calculateAndCreatePrice: authedProcedure
    .input(calculatePriceForStripeSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get full event type with metadata
        const eventType = await ctx.prisma.eventType.findUnique({
          where: {
            id: input.eventTypeId,
          },
          select: {
            id: true,
            price: true,
            currency: true,
            metadata: true,
          },
        });

        if (!eventType) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Event type with id ${input.eventTypeId} not found`,
          });
        }

        // Get variable pricing config
        const variablePricing = getVariablePricingConfig(eventType);

        // Create context for price calculation
        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);

        const context: PricingContext = {
          duration: input.duration,
          startTime,
          endTime,
          timezone: "UTC", // Default timezone
          eventTypeId: input.eventTypeId,
          dayOfWeek: startTime.getDay(), // 0 = Sunday, 1 = Monday, etc.
          ...input.formValues,
        };

        // Calculate variable price
        const calculation = calculateVariablePrice(variablePricing, context);

        // Get Stripe instance
        const { default: stripePkg } = await import("stripe");
        const stripe = new stripePkg(process.env.STRIPE_SECRET_KEY || "", {
          apiVersion: "2020-08-27",
        });

        // Get or create Stripe price object
        const priceId = await getOrCreateStripePrice(
          stripe,
          input.stripeAccountId,
          calculation,
          eventType.id
        );

        // Generate payment metadata
        const metadata = generatePaymentMetadata(calculation, {
          id: eventType.id,
          price: eventType.price,
          currency: eventType.currency,
          metadata: eventType.metadata,
        } as Partial<EventType>);

        return {
          priceId,
          price: calculation.totalPrice,
          currency: calculation.currency,
          breakdown: calculation.breakdown,
          metadata,
        };
      } catch (error) {
        log.error("Error in calculateAndCreatePrice", { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to calculate price",
        });
      }
    }),
});
