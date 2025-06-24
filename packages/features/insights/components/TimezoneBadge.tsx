import { decodeHTML } from "entities";
import { useMemo } from "react";

import { useDataTable } from "@calcom/features/data-table";
import NoSSR from "@calcom/lib/components/NoSSR";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { Badge } from "@calcom/ui/components/badge";
import { Tooltip } from "@calcom/ui/components/tooltip";

const TimezoneBadgeContent = () => {
  const { t } = useLocale();
  const { timeZone: userTimezone } = useDataTable();

  const timezoneData = useMemo(() => {
    // Use Cal's standard CURRENT_TIMEZONE constant
    const browserTimezone = CURRENT_TIMEZONE;

    if (!browserTimezone || !userTimezone) {
      return null;
    }

    if (browserTimezone === userTimezone) {
      return null;
    }

    const rawTooltipContent = t("timezone_mismatch_tooltip", {
      browserTimezone,
      userTimezone,
    });

    const decodedTooltipContent = decodeHTML(rawTooltipContent);

    return {
      browser: browserTimezone,
      user: userTimezone,
      tooltipContent: decodedTooltipContent,
      badgeContent: userTimezone,
    };
  }, [userTimezone, t]);

  // Don't render anything if no timezone mismatch
  if (!timezoneData) {
    return null;
  }

  return (
    <Tooltip content={timezoneData.tooltipContent}>
      <Badge variant="gray" size="lg" startIcon="globe" data-testid="timezone-mismatch-badge">
        {timezoneData.badgeContent}
      </Badge>
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
