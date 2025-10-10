import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";

type UserBookingLimitsDisplayProps = {
  bookingLimits?: IntervalLimit;
};

export const UserBookingLimitsDisplay = ({ bookingLimits }: UserBookingLimitsDisplayProps) => {
  const { t } = useLocale();

  if (!bookingLimits || Object.keys(bookingLimits).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-4">
      <div>
        <h3 className="text-emphasis mb-1 text-base font-semibold">{t("booking_limits")}</h3>
        <p className="text-subtle text-sm">{t("booking_limits_description")}</p>
      </div>

      <div className="border-subtle rounded-lg border p-6">
        <div className="space-y-3">
          {Object.entries(bookingLimits).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-default font-medium">{value}</span>
                <span className="text-subtle">
                  {intervalLimitKeyToUnit(key as keyof typeof intervalLimitKeyToUnit)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
