import z from "zod";

import { EventTypeCustomInputType } from "@calcom/prisma/enums";

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

enum BookerLayouts {
  MONTH_VIEW = "month_view",
  WEEK_VIEW = "week_view",
  COLUMN_VIEW = "column_view",
}

const bookerLayoutOptions = [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW];

const layoutOptionsSchema = z.union([
  z.literal(bookerLayoutOptions[0]),
  z.literal(bookerLayoutOptions[1]),
  z.literal(bookerLayoutOptions[2]),
]);

export const bookerLayoutsSchema = z
  .object({
    enabledLayouts: z.array(layoutOptionsSchema),
    defaultLayout: layoutOptionsSchema,
  })
  .nullable();

export type BookerLayoutSettings = z.infer<typeof bookerLayoutsSchema>;

export const vitalSettingsUpdateSchema = z.object({
  connected: z.boolean().optional(),
  selectedParam: z.string().optional(),
  sleepValue: z.number().optional(),
});

const defaultConferencingAppSchema = z.object({
  appSlug: z.string().default("daily-video").optional(),
  appLink: z.string().optional(),
});

export type DefaultConferencingApp = z.infer<typeof defaultConferencingAppSchema>;

export const userMetadataSchema = z
  .object({
    proPaidForByTeamId: z.number().optional(),
    stripeCustomerId: z.string().optional(),
    vitalSettings: vitalSettingsUpdateSchema.optional(),
    isPremium: z.boolean().optional(),
    /** Minutes */
    sessionTimeout: z.number().optional(),
    defaultConferencingApp: defaultConferencingAppSchema.optional(),
    defaultBookerLayouts: bookerLayoutsSchema.optional(),
    emailChangeWaitingForVerification: z
      .string()
      .transform((data) => data.toLowerCase())
      .optional(),
    migratedToOrgFrom: z
      .object({
        username: z.string().or(z.null()).optional(),
        lastMigrationTime: z.string().optional(),
        reverted: z.boolean().optional(),
        revertTime: z.string().optional(),
      })
      .optional(),
  })
  .nullable();

export const teamMetadataSchema = z
  .object({
    requestedSlug: z.string().or(z.null()),
    paymentId: z.string(),
    subscriptionId: z.string().nullable(),
    subscriptionItemId: z.string().nullable(),
    orgSeats: z.number().nullable(),
    orgPricePerSeat: z.number().nullable(),
    migratedToOrgFrom: z
      .object({
        teamSlug: z.string().or(z.null()).optional(),
        lastMigrationTime: z.string().optional(),
        reverted: z.boolean().optional(),
        lastRevertTime: z.string().optional(),
      })
      .optional(),
    billingPeriod: z.nativeEnum(BillingPeriod).optional(),
  })
  .partial()
  .nullable();

export type TeamMetadata = z.infer<typeof teamMetadataSchema>;

export const customInputOptionSchema = z.array(
  z.object({
    label: z.string(),
    type: z.string(),
  })
);

export const customInputSchema = z.object({
  id: z.number(),
  eventTypeId: z.number(),
  label: z.string(),
  type: z.nativeEnum(EventTypeCustomInputType),
  options: customInputOptionSchema.optional().nullable(),
  required: z.boolean(),
  placeholder: z.string(),
  hasToBeCreated: z.boolean().optional(),
});

export type CustomInputSchema = z.infer<typeof customInputSchema>;
