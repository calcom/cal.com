import { z } from "zod";

import { calculateVariablePrice, createPricingContext } from "@calcom/lib/pricing/calculator";
import { getVariablePricingConfig, validateVariablePricingConfig } from "@calcom/lib/pricing/utils";
import type { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import type { TrpcSessionUser } from "../../../types";

// Schemas and verification functions copied from variablePricing.ts
const getVariablePricingInputSchema = z.object({
  eventTypeId: z.number().int(),
});

// Schema for updating pricing rules
const updateVariablePricingInputSchema = z.object({
  eventTypeId: z.number().int(),
  pricingConfig: z.object({
    enabled: z.boolean(),
    basePrice: z.number().min(0),
    currency: z.string(),
    rules: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["duration", "timeOfDay", "dayOfWeek", "custom"]),
        enabled: z.boolean(),
        priority: z.number().int(),
        modifier: z.object({
          type: z.enum(["percentage", "fixed"]),
          value: z.number(),
        }),
        description: z.string(),
        condition: z.object({
          // Duration condition
          minDuration: z.number().int().min(1).optional(),
          maxDuration: z.number().int().min(1).optional(),
          // Time of day condition
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          // Day of week condition
          days: z.array(z.number().int().min(0).max(6)).optional(),
        }),
      })
    ),
  }),
});

// Schema for calculating price
const calculatePriceInputSchema = z.object({
  eventTypeId: z.number().int(),
  duration: z.number().int().min(1),
  startTime: z.string(), // ISO date string
  endTime: z.string(), // ISO date string
  timezone: z.string(),
});

// Verify user has access to the event type
async function verifyEventTypeAccess(
  ctx: { prisma: typeof prisma; user: TrpcSessionUser },
  eventTypeId: number
) {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  const eventType = await ctx.prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: {
      userId: true,
      teamId: true,
      team: {
        select: {
          members: {
            select: {
              userId: true,
              role: true,
            },
            where: {
              userId: ctx.user.id,
            },
          },
        },
      },
    },
  });

  if (!eventType) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Event type with id ${eventTypeId} not found`,
    });
  }

  // Check if user owns the event type or is a member of the team
  const isOwner = eventType.userId === ctx.user.id;
  const isTeamMember = eventType.teamId && eventType.team?.members && eventType.team.members.length > 0;

  if (!isOwner && !isTeamMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have access to event type with id ${eventTypeId}`,
    });
  }
}

// Create the pricing router
export const pricingRouter = router({
  /**
   * Get variable pricing rules for an event type
   */
  getRules: authedProcedure.input(getVariablePricingInputSchema).query(async ({ ctx, input }) => {
    await verifyEventTypeAccess(ctx, input.eventTypeId);

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

    // Use the MinimalEventType interface to ensure compatibility
    const minimalEventType = {
      id: eventType.id,
      metadata: eventType.metadata,
      price: eventType.price,
      currency: eventType.currency,
    };

    const variablePricing = getVariablePricingConfig(minimalEventType);

    return {
      pricingConfig: variablePricing,
    };
  }),

  /**
   * Update variable pricing rules for an event type
   */
  updateRules: authedProcedure.input(updateVariablePricingInputSchema).mutation(async ({ ctx, input }) => {
    await verifyEventTypeAccess(ctx, input.eventTypeId);

    // Validate the rules
    const validationResult = validateVariablePricingConfig(input.pricingConfig);

    if (!validationResult.isValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: validationResult.errors[0] || "Invalid pricing rules",
      });
    }

    // Get the event type
    const eventType = await ctx.prisma.eventType.findUnique({
      where: {
        id: input.eventTypeId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!eventType) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Event type with id ${input.eventTypeId} not found`,
      });
    }

    // Update the event type with variable pricing config
    const updatedEventType = await ctx.prisma.eventType.update({
      where: {
        id: input.eventTypeId,
      },
      data: {
        // If variable pricing is enabled, set the base price and currency
        ...(input.pricingConfig.enabled
          ? {
              price: input.pricingConfig.basePrice,
              currency: input.pricingConfig.currency,
            }
          : {}),
        // Create a new metadata object with variable pricing config
        metadata: {
          // Cast the existing metadata to the correct type or use an empty object
          ...((eventType.metadata as Record<string, unknown>) || {}),
          variablePricing: {
            enabled: input.pricingConfig.enabled,
            basePrice: input.pricingConfig.basePrice,
            currency: input.pricingConfig.currency,
            rules: input.pricingConfig.rules,
          },
        },
      },
      select: {
        id: true,
        price: true,
        currency: true,
        metadata: true,
      },
    });

    // Convert to MinimalEventType for compatibility
    const minimalEventType = {
      id: updatedEventType.id,
      metadata: updatedEventType.metadata,
      price: updatedEventType.price,
      currency: updatedEventType.currency,
    };

    // Get the updated pricing config
    const variablePricing = getVariablePricingConfig(minimalEventType);

    return {
      pricingConfig: variablePricing,
    };
  }),

  /**
   * Calculate price based on duration and date/time
   */
  calculate: authedProcedure.input(calculatePriceInputSchema).query(async ({ ctx, input }) => {
    await verifyEventTypeAccess(ctx, input.eventTypeId);

    // Get the event type
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

    // Convert to MinimalEventType for compatibility
    const minimalEventType = {
      id: eventType.id,
      metadata: eventType.metadata,
      price: eventType.price,
      currency: eventType.currency,
    };

    // Get variable pricing config
    const variablePricing = getVariablePricingConfig(minimalEventType);

    // If variable pricing is not enabled, return the base price
    if (!variablePricing.enabled) {
      return {
        basePrice: variablePricing.basePrice,
        totalPrice: variablePricing.basePrice,
        currency: variablePricing.currency,
        appliedRules: [],
        breakdown: [
          {
            label: "Base price",
            type: "base",
            amount: variablePricing.basePrice,
          },
        ],
      };
    }

    // Create pricing context from input parameters
    const pricingContext = createPricingContext(
      input.eventTypeId,
      new Date(input.startTime),
      new Date(input.endTime),
      input.timezone
    );

    // Calculate variable price
    const calculation = calculateVariablePrice(variablePricing, pricingContext);

    return calculation;
  }),
});
