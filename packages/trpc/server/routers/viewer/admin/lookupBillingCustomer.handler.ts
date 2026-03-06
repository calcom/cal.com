import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TLookupBillingCustomerInput } from "./lookupBillingCustomer.schema";

type LookupBillingCustomerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TLookupBillingCustomerInput;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDunningExplanation(
  status: string,
  firstFailedAt: Date | null,
  failureReason: string | null
): string {
  if (status === "CURRENT") return "Payment is up to date.";

  const daysSinceFirstFailure = firstFailedAt
    ? Math.floor((Date.now() - firstFailedAt.getTime()) / MS_PER_DAY)
    : 0;

  const reasonSuffix = failureReason ? ` Reason: ${failureReason}.` : "";

  switch (status) {
    case "WARNING":
      return `Payment failed ${daysSinceFirstFailure} day(s) ago. Will soft-block at 7 days, hard-block at 14 days.${reasonSuffix}`;
    case "SOFT_BLOCKED":
      return `Payment overdue for ${daysSinceFirstFailure} day(s). Member invitations and event type creation are blocked. Will hard-block at 14 days.${reasonSuffix}`;
    case "HARD_BLOCKED":
      return `Payment overdue for ${daysSinceFirstFailure} day(s). Bookings, API access, invitations, and event type creation are blocked. Will cancel at 90 days.${reasonSuffix}`;
    case "CANCELLED":
      return `Subscription cancelled after ${daysSinceFirstFailure} day(s) of non-payment. All access blocked.${reasonSuffix}`;
    default:
      return `Unknown status: ${status}.`;
  }
}

const billingSelect = {
  id: true,
  customerId: true,
  subscriptionId: true,
  status: true,
  planName: true,
  dunningStatus: {
    select: {
      status: true,
      firstFailedAt: true,
      lastFailedAt: true,
      failureReason: true,
      invoiceUrl: true,
      notificationsSent: true,
    },
  },
} as const;

const teamSelect = {
  id: true,
  name: true,
  slug: true,
  isOrganization: true,
} as const;

type BillingResult = {
  id: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  planName: string;
  dunningStatus: {
    status: string;
    firstFailedAt: Date | null;
    lastFailedAt: Date | null;
    failureReason: string | null;
    invoiceUrl: string | null;
    notificationsSent: number;
  } | null;
};

function mapBillingResult(
  b: BillingResult,
  entityType: "team" | "organization",
  team: { id: number; name: string; slug: string | null; isOrganization: boolean } | null
) {
  const dunning = b.dunningStatus;
  const dunningStatus = (dunning?.status as string) ?? "CURRENT";

  return {
    billingId: b.id,
    entityType,
    customerId: b.customerId,
    subscriptionId: b.subscriptionId,
    subscriptionStatus: b.status,
    planName: b.planName,
    teamId: team?.id ?? null,
    teamName: team?.name ?? null,
    teamSlug: team?.slug ?? null,
    isOrganization: team?.isOrganization ?? (entityType === "organization"),
    dunningStatus,
    dunningFirstFailedAt: dunning?.firstFailedAt?.toISOString() ?? null,
    dunningLastFailedAt: dunning?.lastFailedAt?.toISOString() ?? null,
    dunningFailureReason: dunning?.failureReason ?? null,
    dunningInvoiceUrl: dunning?.invoiceUrl ?? null,
    dunningNotificationsSent: dunning?.notificationsSent ?? 0,
    dunningExplanation: getDunningExplanation(
      dunningStatus,
      dunning?.firstFailedAt ?? null,
      dunning?.failureReason ?? null
    ),
  };
}

export const lookupBillingCustomerHandler = async ({ input }: LookupBillingCustomerOptions) => {
  const { customerId } = input;

  const [teamBillings, orgBillings] = await Promise.all([
    prisma.teamBilling.findMany({
      where: { customerId },
      select: {
        ...billingSelect,
        team: { select: teamSelect },
      },
    }),
    prisma.organizationBilling.findMany({
      where: { customerId },
      select: {
        ...billingSelect,
        team: { select: teamSelect },
      },
    }),
  ]);

  return {
    results: [
      ...teamBillings.map((b) => mapBillingResult(b, "team", b.team ?? null)),
      ...orgBillings.map((b) => mapBillingResult(b, "organization", b.team ?? null)),
    ],
  };
};

export default lookupBillingCustomerHandler;
