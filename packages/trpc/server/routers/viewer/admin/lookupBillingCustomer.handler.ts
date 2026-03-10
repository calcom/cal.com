import {
  getAdminBillingRepository,
  getSeatBillingStrategyFactory,
} from "@calcom/features/ee/billing/di/containers/Billing";
import type { AdminBillingRecord } from "@calcom/features/ee/billing/repository/adminBilling/AdminBillingRepository";
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

async function resolveStrategyName(teamId: number | null): Promise<string | null> {
  if (!teamId) return null;
  try {
    const factory = getSeatBillingStrategyFactory();
    const strategy = await factory.createByTeamId(teamId);
    return strategy.strategyName;
  } catch {
    return null;
  }
}

function mapBillingResult(
  b: AdminBillingRecord,
  entityType: "team" | "organization",
  strategyName: string | null
) {
  const team = b.team;
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
    isOrganization: team?.isOrganization ?? entityType === "organization",
    billingPeriod: b.billingPeriod,
    billingMode: b.billingMode,
    strategyName,
    pricePerSeat: b.pricePerSeat,
    paidSeats: b.paidSeats,
    minSeats: b.minSeats,
    highWaterMark: b.highWaterMark,
    highWaterMarkPeriodStart: b.highWaterMarkPeriodStart?.toISOString() ?? null,
    subscriptionStart: b.subscriptionStart?.toISOString() ?? null,
    subscriptionTrialEnd: b.subscriptionTrialEnd?.toISOString() ?? null,
    subscriptionEnd: b.subscriptionEnd?.toISOString() ?? null,
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
  const repo = getAdminBillingRepository();

  const billings = await repo.findByCustomerId(customerId);

  const results = await Promise.all(
    billings.map(async ({ record, entityType }) => {
      const strategyName = await resolveStrategyName(record.team?.id ?? null);
      return mapBillingResult(record, entityType, strategyName);
    })
  );

  return { results };
};

export default lookupBillingCustomerHandler;
