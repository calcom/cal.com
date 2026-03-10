"use client";

import { Badge } from "@calcom/ui/components/badge";

import { formatCyclePosition, formatStrategyName, strategyBadgeVariant } from "./billingUtils";
import { DetailRow } from "./DetailRow";

export type BillingDetails = {
  billingPeriod: string | null;
  billingMode: string;
  strategyName: string | null;
  pricePerSeat: number | null;
  paidSeats: number | null;
  minSeats: number | null;
  highWaterMark: number | null;
  highWaterMarkPeriodStart: string | null;
  subscriptionStart: string | null;
  subscriptionTrialEnd: string | null;
  subscriptionEnd: string | null;
};

function SeatDetails({
  paidSeats,
  minSeats,
  pricePerSeat,
  strategyName,
  highWaterMark,
  highWaterMarkPeriodStart,
  t,
}: {
  paidSeats: number | null;
  minSeats: number | null;
  pricePerSeat: number | null;
  strategyName: string | null;
  highWaterMark: number | null;
  highWaterMarkPeriodStart: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (paidSeats === null && minSeats === null && pricePerSeat === null) return null;

  return (
    <div className="mt-2 space-y-1">
      {paidSeats !== null && <DetailRow label={t("paid_seats")} value={String(paidSeats)} />}
      {minSeats !== null && <DetailRow label={t("min_seats")} value={String(minSeats)} />}
      {pricePerSeat !== null && (
        <DetailRow label={t("price_per_seat")} value={`$${(pricePerSeat / 100).toFixed(2)}`} />
      )}
      {strategyName === "HighWaterMark" && highWaterMark !== null && (
        <>
          <DetailRow label={t("high_water_mark")} value={String(highWaterMark)} />
          {highWaterMarkPeriodStart && (
            <DetailRow
              label={t("hwm_period_start")}
              value={new Date(highWaterMarkPeriodStart).toLocaleDateString()}
            />
          )}
        </>
      )}
    </div>
  );
}

function SubscriptionDates({
  subscriptionStart,
  subscriptionTrialEnd,
  subscriptionEnd,
  billingPeriod,
  t,
}: {
  subscriptionStart: string | null;
  subscriptionTrialEnd: string | null;
  subscriptionEnd: string | null;
  billingPeriod: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const isInTrial = subscriptionTrialEnd && new Date(subscriptionTrialEnd) > new Date();
  const cyclePosition = formatCyclePosition(subscriptionStart, subscriptionEnd, billingPeriod, t);

  return (
    <div className="mt-2 space-y-1">
      {subscriptionStart && (
        <DetailRow
          label={t("subscription_start")}
          value={new Date(subscriptionStart).toLocaleDateString()}
        />
      )}
      {subscriptionTrialEnd && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-subtle text-xs">{t("trial_end")}</span>
          <div className="flex items-center gap-1">
            <span className="text-emphasis text-right text-xs font-medium">
              {new Date(subscriptionTrialEnd).toLocaleDateString()}
            </span>
            {isInTrial && <Badge variant="orange">{t("in_trial")}</Badge>}
          </div>
        </div>
      )}
      {subscriptionEnd && (
        <DetailRow label={t("period_end")} value={new Date(subscriptionEnd).toLocaleDateString()} />
      )}
      {cyclePosition && <DetailRow label={t("cycle_position")} value={cyclePosition} />}
    </div>
  );
}

export function BillingDetailsSection({
  billing,
  t,
}: {
  billing: BillingDetails;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="border-subtle mt-3 border-t pt-3">
      <h4 className="text-emphasis mb-2 text-xs font-semibold">{t("billing_details")}</h4>

      <div className="space-y-1">
        <DetailRow
          label={t("billing_period")}
          value={
            billing.billingPeriod === "MONTHLY"
              ? t("monthly")
              : billing.billingPeriod === "ANNUALLY"
                ? t("annually")
                : t("not_set")
          }
        />
        <DetailRow
          label={t("billing_mode")}
          value={billing.billingMode === "ACTIVE_USERS" ? t("active_users") : t("seats")}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-subtle text-xs">{t("billing_strategy")}</span>
          <Badge variant={strategyBadgeVariant(billing.strategyName)}>
            {formatStrategyName(billing.strategyName, t)}
          </Badge>
        </div>
      </div>

      <SeatDetails
        paidSeats={billing.paidSeats}
        minSeats={billing.minSeats}
        pricePerSeat={billing.pricePerSeat}
        strategyName={billing.strategyName}
        highWaterMark={billing.highWaterMark}
        highWaterMarkPeriodStart={billing.highWaterMarkPeriodStart}
        t={t}
      />

      <SubscriptionDates
        subscriptionStart={billing.subscriptionStart}
        subscriptionTrialEnd={billing.subscriptionTrialEnd}
        subscriptionEnd={billing.subscriptionEnd}
        billingPeriod={billing.billingPeriod}
        t={t}
      />
    </div>
  );
}
