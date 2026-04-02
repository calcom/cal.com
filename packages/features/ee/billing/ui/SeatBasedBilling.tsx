"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

/**
 * SeatBasedBilling — a reusable presentational component that displays
 * high-water mark (HWM) seat-billing information for monthly subscriptions.
 *
 * Data comes from the `getSubscriptionStatus` TRPC handler which now returns:
 *   - currentMembers: number | null
 *   - highWaterMark: number | null
 *   - highWaterMarkPeriodStart: string | null  (ISO date)
 *   - paidSeats: number | null
 */

export interface SeatBasedBillingProps {
  /** Current number of team members */
  currentMembers: number;
  /** Peak member count recorded during the billing period */
  highWaterMark: number | null;
  /** Number of seats currently paid for in Stripe */
  paidSeats: number | null;
  /** ISO-8601 start date of the current HWM billing period */
  highWaterMarkPeriodStart: string | null;
}

interface SeatRowProps {
  label: string;
  value: number;
  isBold?: boolean;
  underline?: "dashed" | "solid";
  className?: string;
}

function SeatRow({ label, value, isBold = false, underline, className = "" }: SeatRowProps) {
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div
      className={classNames(
        "flex justify-between px-2.5 py-1.5",
        underline === "dashed"
          ? "border-b border-dashed"
          : underline === "solid"
            ? "border-b"
            : undefined,
        className
      )}>
      <span
        className={classNames(
          "text-sm",
          isBold ? "font-semibold" : "text-muted-foreground font-medium"
        )}>
        {label}
      </span>
      <span
        className={classNames(
          "text-sm",
          isBold ? "font-semibold" : "text-muted-foreground font-medium"
        )}>
        {numberFormatter.format(value)}
      </span>
    </div>
  );
}

export function SeatBasedBilling({
  currentMembers,
  highWaterMark,
  paidSeats,
  highWaterMarkPeriodStart,
}: SeatBasedBillingProps) {
  const { t } = useLocale();

  const peakSeats = highWaterMark ?? currentMembers;
  const billedSeats = Math.max(peakSeats, currentMembers, 1);

  const formattedPeriodStart = highWaterMarkPeriodStart
    ? dayjs.utc(highWaterMarkPeriodStart).format("MMM D, YYYY")
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-base font-semibold">{t("seat_billing")}</h3>
        <p className="text-muted-foreground text-sm">
          {formattedPeriodStart
            ? t("seat_billing_description", { start: formattedPeriodStart })
            : t("seat_billing_description_no_date")}
        </p>
      </div>
      <div className="rounded-md border">
        <div className="px-4 pb-4 pt-1">
          <div className="my-3">
            <SeatRow label={t("current_members")} value={currentMembers} underline="dashed" />
            <SeatRow label={t("peak_seats_this_period")} value={peakSeats} underline="solid" />
            <SeatRow label={t("billed_seats")} value={billedSeats} isBold />
          </div>
          {paidSeats !== null && (
            <p className="text-muted-foreground px-2.5 text-xs">
              {t("paid_seats_count", { count: paidSeats })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SeatBasedBilling;
