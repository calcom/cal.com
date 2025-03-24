import { type } from "arktype";

import { EventTypeCustomInputType } from "@calcom/prisma/enums";

import { BillingPeriod, bookerLayoutOptions } from "./zod-utils.js";

const layoutOptionsSchema = type.enumerated(...bookerLayoutOptions);

export const bookerLayoutsSchema = type({
  enabledLayouts: layoutOptionsSchema.array(),
  defaultLayout: layoutOptionsSchema,
});

export type BookerLayoutSettings = typeof bookerLayoutsSchema.infer;

export const vitalSettingsUpdateSchema = type({
  connected: "boolean?",
  selectedParam: "string?",
  sleepValue: "number?",
});

const defaultConferencingAppSchema = type({
  appSlug: "string = 'daily-video'",
  appLink: "string?",
});

export type DefaultConferencingApp = typeof defaultConferencingAppSchema.infer;

const baseMigrationSourceSchema = type({
  lastMigrationTime: "string?",
  reverted: "boolean?",
  revertTime: "string?",
});

const userMigrationSourceSchema = baseMigrationSourceSchema.merge({ username: "string | null?" });

export const userMetadataSchema = type({
  proPaidForByTeamId: "number?",
  stripeCustomerId: "string?",
  vitalSettings: vitalSettingsUpdateSchema.optional(),
  isPremium: "boolean?",
  /** Minutes */
  sessionTimeout: "number?",
  defaultConferencingApp: defaultConferencingAppSchema.or("null").optional(),
  defaultBookerLayouts: bookerLayoutsSchema.or("null").optional(),
  emailChangeWaitingForVerification: "string.lower?",
  migratedToOrgFrom: userMigrationSourceSchema.optional(),
});

const teamMigrationSourceSchema = baseMigrationSourceSchema.merge({
  teamSlug: "string | null?",
});

export const teamMetadataSchema = type({
  requestedSlug: "string | null",
  paymentId: "string",
  subscriptionId: "string | null",
  subscriptionItemId: "string | null",
  orgSeats: "string | null",
  orgPricePerSeat: "string | null",
  migratedToOrgFrom: teamMigrationSourceSchema.optional(),
  billinPeriod: type.valueOf(BillingPeriod),
}).partial();

export const customInputOptionSchema = type({
  label: "string",
  type: "string",
}).array();

export const customInputSchema = type({
  id: "number",
  eventTypeId: "number",
  label: "string",
  type: type.valueOf(EventTypeCustomInputType),
  options: customInputOptionSchema.or("null").optional(),
  required: "boolean",
  placeholder: "string",
  hasToBeCreated: "boolean?",
});

export type CustomInputSchema = typeof customInputSchema.infer;
