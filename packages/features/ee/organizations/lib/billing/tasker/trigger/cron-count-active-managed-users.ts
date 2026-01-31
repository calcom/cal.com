import process from "node:process";
import { logger, schedules } from "@trigger.dev/sdk";
import { CRON_COUNT_ACTIVE_MANAGED_USERS_JOB_ID } from "../constants";
import { invoiceActiveManagedUsers } from "./invoice-active-managed-users";

function parseOrgIdsFromEnv(): number[] {
  const raw = process.env.ORG_IDS_FOR_ACTIVE_USER_BILLING;
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number)
    .filter((id) => !Number.isNaN(id));
}

function getPreviousMonthPeriod(): { periodStart: number; periodEnd: number } {
  const now = new Date();
  const firstDayOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 1);
  const firstDayOfPreviousMonth = new Date(
    Date.UTC(lastDayOfPreviousMonth.getUTCFullYear(), lastDayOfPreviousMonth.getUTCMonth(), 1)
  );

  return {
    periodStart: Math.floor(firstDayOfPreviousMonth.getTime() / 1000),
    periodEnd: Math.floor(lastDayOfPreviousMonth.getTime() / 1000),
  };
}

export const cronCountActiveManagedUsers = schedules.task({
  id: CRON_COUNT_ACTIVE_MANAGED_USERS_JOB_ID,
  cron: "0 0 1 * *",
  run: async () => {
    const orgIds = parseOrgIdsFromEnv();
    if (orgIds.length === 0) {
      logger.info("No org IDs configured for active user billing (ORG_IDS_FOR_ACTIVE_USER_BILLING)");
      return;
    }

    const billingEmail = process.env.ACTIVE_USER_BILLING_EMAIL;
    if (!billingEmail) {
      logger.error("ACTIVE_USER_BILLING_EMAIL env variable is not set, skipping invoice creation");
      return;
    }

    const pricePerUserRaw = process.env.ACTIVE_USER_BILLING_PRICE_PER_USER_CENTS;
    if (!pricePerUserRaw) {
      logger.error(
        "ACTIVE_USER_BILLING_PRICE_PER_USER_CENTS env variable is not set, skipping invoice creation"
      );
      return;
    }
    const pricePerUserInCents = Number(pricePerUserRaw);
    if (Number.isNaN(pricePerUserInCents) || pricePerUserInCents <= 0) {
      logger.error("ACTIVE_USER_BILLING_PRICE_PER_USER_CENTS must be a positive number", {
        pricePerUserRaw,
      });
      return;
    }

    const currency = process.env.ACTIVE_USER_BILLING_CURRENCY ?? "usd";
    const stripeCustomerId = process.env.ACTIVE_USER_BILLING_STRIPE_CUSTOMER_ID || undefined;

    const { periodStart, periodEnd } = getPreviousMonthPeriod();

    logger.info("Starting active managed users invoice cron", {
      orgIds,
      periodStart: new Date(periodStart * 1000).toISOString(),
      periodEnd: new Date(periodEnd * 1000).toISOString(),
      hasBillingEmail: Boolean(billingEmail),
      pricePerUserInCents,
      currency,
      hasExistingCustomer: Boolean(stripeCustomerId),
    });

    await invoiceActiveManagedUsers.trigger({
      organizationIds: orgIds,
      periodStart,
      periodEnd,
      billingEmail,
      pricePerUserInCents,
      currency,
      stripeCustomerId,
    });

    logger.info("Dispatched invoiceActiveManagedUsers task");
  },
});
