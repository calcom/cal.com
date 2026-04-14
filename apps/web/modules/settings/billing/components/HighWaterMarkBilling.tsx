"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/i18n/useLocale";
import classNames from "@calcom/ui/classNames";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

interface HighWaterMarkBillingProps {
  currentMembers: number;
  highWaterMark: number | null;
  paidSeats: number | null;
  highWaterMarkPeriodStart: string | null;
}

type SeatRowProps = {
  label: string;
  value: number;
  isBold?: boolean;
  underline?: "dashed" | "solid";
  className?: string;
};

function SeatRow({ label, value, isBold = false, underline, className = "" }: SeatRowProps) {
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div
      className={classNames(
        "py-1.5 px-2.5 flex justify-between",
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
          isBold ? "font-semibold" : "font-medium text-muted-foreground"
        )}>
        {label}
      </span>
      <span
        className={classNames(
          "text-sm",
          isBold ? "font-semibold" : "font-medium text-muted-foreground"
        )}>
        {numberFormatter.format(value)}
      </span>
    </div>
  );
}

export function HighWaterMarkBilling({
  currentMembers,
  highWaterMark,
  paidSeats,
  highWaterMarkPeriodStart,
}: HighWaterMarkBillingProps) {
  const { t } = useLocale();

  const peakSeats = highWaterMark ?? currentMembers;
  const billedSeats = Math.max(peakSeats, currentMembers, 1);

  const formattedPeriodStart = highWaterMarkPeriodStart
    ? dayjs.utc(highWaterMarkPeriodStart).format("MMM D, YYYY")
    : null;

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>{t("seat_billing")}</CardFrameTitle>
        <CardFrameDescription>
          {formattedPeriodStart
            ? t("seat_billing_description", { start: formattedPeriodStart })
            : t("seat_billing_description_no_date")}
        </CardFrameDescription>
      </CardFrameHeader>
      <Card>
        <CardPanel className="px-4 pt-1 pb-4">
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
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
