import { z } from "zod";

import { calculateVariablePrice, createPricingContext } from "@calcom/lib/pricing/calculator";
import type { PriceModifier } from "@calcom/lib/pricing/types";
import { getVariablePricingConfig, validateVariablePricingConfig } from "@calcom/lib/pricing/utils";
import type { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import type { TrpcSessionUser } from "../../../types";

// Input schema for getting pricing rules
const getVariablePricingInputSchema = z.object({
  eventTypeId: z.number().int(),
});

// Zod schemas for pricing rules conditions
const durationConditionSchema = z
  .object({
    minDuration: z.number().int().min(1).optional(),
    maxDuration: z.number().int().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.minDuration && data.maxDuration) {
        return data.minDuration <= data.maxDuration;
      }
      return true;
    },
    {
      message: "minDuration must be less than or equal to maxDuration",
    }
  );

const timeOfDayConditionSchema = z.object({
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
});

const dayOfWeekConditionSchema = z.object({
  days: z
    .array(z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]))
    .min(1),
});

const customConditionSchema = z.object({
  script: z.string().optional(),
  parameters: z.record(z.any()).optional(),
});

// Price modifier schema
const priceModifierSchema = z.object({
  type: z.enum(["surcharge", "discount", "absolute"]),
  value: z.number().int().min(0),
  percentage: z.number().min(0).max(100).optional(),
});

// Pricing rule schema
const pricingRuleSchema = z.object({
  id: z.string(),
  type: z.enum(["duration", "timeOfDay", "dayOfWeek", "custom"]),
  description: z.string(),
  enabled: z.boolean(),
  priority: z.number().int().min(0).optional().default(0),
  condition: z.union([
    durationConditionSchema,
    timeOfDayConditionSchema,
    dayOfWeekConditionSchema,
    customConditionSchema,
  ]),
  price: z.number().int().min(0).optional(), // For absolute pricing
  priceModifier: priceModifierSchema.optional(), // For percentage/fixed modifiers
});

// Input schema for updating pricing rules
const updateVariablePricingInputSchema = z.object({
  eventTypeId: z.number().int(),
  pricingConfig: z.object({
    enabled: z.boolean(),
    basePrice: z.number().int().min(0),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/, "Currency must be 3 uppercase letters"),
    rules: z.array(pricingRuleSchema),
  }),
});

// Input schema for calculating price
const calculatePriceInputSchema = z.object({
  eventTypeId: z.number().int(),
  duration: z.number().int().min(1), // duration in minutes
  startTime: z.string().datetime(), // ISO datetime string
  endTime: z.string().datetime(), // ISO datetime string
  timezone: z.string().default("UTC"),
});

/**
 * Verify that user has access to the event type
 */
async function verifyEventTypeAccess(
  ctx: { prisma: typeof prisma; user: NonNullable<TrpcSessionUser> },
  eventTypeId: number
) {
  // Get event type with owner and team
  const eventType = await ctx.prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
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
      schedulingType: true,
      hosts: {
        select: {
          userId: true,
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

  const isOwner = eventType.userId === ctx.user.id;
  const isTeamOwner = eventType.teamId
    ? eventType.team?.members.some((m) => m.userId === ctx.user.id && m.role === "OWNER")
    : false;
  const isTeamAdmin = eventType.teamId
    ? eventType.team?.members.some((m) => m.userId === ctx.user.id && m.role === "ADMIN")
    : false;
  const isTeamMember = eventType.teamId
    ? eventType.team?.members.some((m) => m.userId === ctx.user.id)
    : false;
  const isHost = eventType.hosts ? eventType.hosts.some((h) => h.userId === ctx.user.id) : false;

  if (!isOwner && !isTeamOwner && !isTeamAdmin && !isTeamMember && !isHost) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have access to event type with id ${eventTypeId}`,
    });
  }

  return eventType;
}

export const variablePricingRouter = router({
  /**
   * Get variable pricing rules for an event type
   */
  getPricingRules: authedProcedure.input(getVariablePricingInputSchema).query(async ({ ctx, input }) => {
    await verifyEventTypeAccess(ctx, input.eventTypeId);

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
  updatePricingRules: authedProcedure
    .input(updateVariablePricingInputSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyEventTypeAccess(ctx, input.eventTypeId);

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

      try {
        // Validate the pricing config
        validateVariablePricingConfig(input.pricingConfig);

        // Update event type with new pricing config
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

        return {
          success: true,
          pricingConfig: getVariablePricingConfig(updatedEventType),
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid pricing configuration",
        });
      }
    }),

  /**
   * Calculate price based on booking parameters
   */
  calculatePrice: authedProcedure.input(calculatePriceInputSchema).query(async ({ ctx, input }) => {
    // We don't need to verify access here, as this endpoint can be called by anyone
    // who has the event type ID, as it's just calculating a price based on public info

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

    // Use the MinimalEventType interface to ensure compatibility
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
        basePrice: eventType.price,
        currency: eventType.currency,
        totalPrice: eventType.price,
        modifiers: [] as PriceModifier[],
        breakdown: [
          {
            description: "Base price",
            amount: eventType.price,
            type: "base" as const,
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

// Export the procedures directly
export const getPricingRules = variablePricingRouter.getPricingRules;
export const updatePricingRules = variablePricingRouter.updatePricingRules;
export const calculatePrice = variablePricingRouter.calculatePrice;
