"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";

import { useDataTable } from "@calcom/features/data-table";
import NoSSR from "@calcom/lib/components/NoSSR";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { Tooltip } from "@calcom/ui/components/tooltip";

const TimezoneBadgeContent = () => {
  const { t } = useLocale();
  const { timeZone: userTimezone } = useDataTable();

  const timezoneData = useMemo(() => {
    // Use Cal's standard CURRENT_TIMEZONE constant
    const browserTimezone = CURRENT_TIMEZONE;

    if (!browserTimezone || !userTimezone || browserTimezone === userTimezone) return null;

    const tooltipContent = t("timezone_mismatch_tooltip", {
      browserTimezone,
      userTimezone,
      interpolation: { escapeValue: false },
    });

    return {
      browser: browserTimezone,
      user: userTimezone,
      tooltipContent,
      badgeContent: userTimezone,
    };
  }, [userTimezone, t]);

  // Don't render anything if no timezone mismatch
  if (!timezoneData) {
    return null;
  }

  return (
    <Tooltip content={timezoneData.tooltipContent}>
      <Info data-testid="timezone-mismatch-badge" className="text-subtle" />
    </Tooltip>
  );
};

export const TimezoneBadge = () => {
  return (
    <NoSSR fallback={null}>
      <TimezoneBadgeContent />
    </NoSSR>
  );
};
