import { useMemo } from "react";

import NoSSR from "@calcom/lib/components/NoSSR";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { useUserTimePreferences } from "@calcom/trpc/react/hooks/useUserTimePreferences";
import { Badge } from "@calcom/ui/components/badge";
import { Tooltip } from "@calcom/ui/components/tooltip";

const TimezoneBadgeContent = () => {
  const { t } = useLocale();
  const { timeZone: userTimezone } = useUserTimePreferences();

  const timezoneData = useMemo(() => {
    // Use Cal's standard CURRENT_TIMEZONE constant
    const browserTimezone = CURRENT_TIMEZONE;

    if (!browserTimezone || !userTimezone) {
      return null;
    }

    if (browserTimezone === userTimezone) {
      return null;
    }

    return {
      browser: browserTimezone,
      user: userTimezone,
      tooltipContent: `Your browser timezone (${browserTimezone}) differs from your settings timezone (${userTimezone})`,
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
