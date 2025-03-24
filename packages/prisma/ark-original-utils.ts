import z from "zod";

import { EventTypeCustomInputType } from "@calcom/prisma/enums";

import { BillingPeriod, bookerLayoutOptions, type bookerLayouts } from "./zod-utils.js";

const zodLayoutOptionsSchema = z.union([
  z.literal(bookerLayoutOptions[0]),
  z.literal(bookerLayoutOptions[1]),
  z.literal(bookerLayoutOptions[2]),
]);

export const zodBookerLayoutsSchema = z
  .object({
    enabledLayouts: z.array(zodLayoutOptionsSchema),
    defaultLayout: zodLayoutOptionsSchema,
  })
  .nullable();

export type BookerLayoutSettings = z.infer<typeof bookerLayouts>;

export const zodVitalSettingsUpdateSchema = z.object({
  connected: z.boolean().optional(),
  selectedParam: z.string().optional(),
  sleepValue: z.number().optional(),
});

const zodSchemaDefaultConferencingApp = z.object({
  appSlug: z.string().default("daily-video").optional(),
  appLink: z.string().optional(),
});

export type DefaultConferencingApp = z.infer<typeof zodSchemaDefaultConferencingApp>;

export const userMetadata = z
  .object({
    proPaidForByTeamId: z.number().optional(),
    stripeCustomerId: z.string().optional(),
    vitalSettings: zodVitalSettingsUpdateSchema.optional(),
    isPremium: z.boolean().optional(),
    /** Minutes */
    sessionTimeout: z.number().optional(),
    defaultConferencingApp: zodSchemaDefaultConferencingApp.optional(),
    defaultBookerLayouts: zodBookerLayoutsSchema.optional(),
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
