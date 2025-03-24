import { type } from "arktype";

import { EventTypeCustomInputType } from "@calcom/prisma/enums";

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

export enum BookerLayouts {
  MONTH_VIEW = "month_view",
  WEEK_VIEW = "week_view",
  COLUMN_VIEW = "column_view",
}

const LayoutOption = type.valueOf(BookerLayouts);

export const BookerLayoutSettings = type({
  enabledLayouts: LayoutOption.array(),
  defaultLayout: LayoutOption,
});

export type BookerLayoutSettings = typeof BookerLayoutSettings.infer;

export const VitalSettingsUpdate = type({
  connected: "boolean?",
  selectedParam: "string?",
  sleepValue: "number?",
});

const DefaultConferencingApp = type({
  appSlug: "string = 'daily-video'",
  appLink: "string?",
});

export type DefaultConferencingApp = typeof DefaultConferencingApp.infer;

const BaseMigrationSource = type({
  lastMigrationTime: "string?",
  reverted: "boolean?",
  revertTime: "string?",
});

const UserMigrationSource = BaseMigrationSource.merge({ username: "string | null?" });

export const UserMetadata = type({
  proPaidForByTeamId: "number?",
  stripeCustomerId: "string?",
  vitalSettings: VitalSettingsUpdate.optional(),
  isPremium: "boolean?",
  /** Minutes */
  sessionTimeout: "number?",
  defaultConferencingApp: DefaultConferencingApp.or("null").optional(),
  defaultBookerLayouts: BookerLayoutSettings.or("null").optional(),
  emailChangeWaitingForVerification: "string.lower?",
  migratedToOrgFrom: UserMigrationSource.optional(),
});

const TeamMigrationSource = BaseMigrationSource.merge({
  teamSlug: "string | null?",
});

export const TeamMetadata = type({
  requestedSlug: "string | null",
  paymentId: "string",
  subscriptionId: "string | null",
  subscriptionItemId: "string | null",
  orgSeats: "string | null",
  orgPricePerSeat: "string | null",
  migratedToOrgFrom: TeamMigrationSource.optional(),
  billingPeriod: type.valueOf(BillingPeriod),
}).partial();

export const CustomInputOptions = type({
  label: "string",
  type: "string",
}).array();

export const CustomInput = type({
  id: "number",
  eventTypeId: "number",
  label: "string",
  type: type.valueOf(EventTypeCustomInputType),
  options: CustomInputOptions.or("null").optional(),
  required: "boolean",
  placeholder: "string",
  hasToBeCreated: "boolean?",
});

export type CustomInput = typeof CustomInput.infer;
