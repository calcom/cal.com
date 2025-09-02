"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { calculateDeltaType, valueFormatter } from "../lib";

export const KPICard = ({
  title,
  previousMetricData,
  previousDateRange,
}: {
  title: string;
  previousMetricData: {
    count: number;
    deltaPrevious: number;
  };
  previousDateRange: { startDate: string; endDate: string };
}) => {
  const { t } = useLocale();

  const deltaType = calculateDeltaType(previousMetricData.deltaPrevious - previousMetricData.count);
  const deltaValue = Number(previousMetricData.deltaPrevious).toFixed(0);

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "increase":
      case "moderateIncrease":
        return "success" as const;
      case "decrease":
      case "moderateDecrease":
        return "error" as const;
      case "unchanged":
      default:
        return "gray" as const;
    }
  };

  // Get appropriate icon for delta
  const getDeltaIcon = (type: string) => {
    switch (type) {
      case "increase":
      case "moderateIncrease":
        return "arrow-up" as const;
      case "decrease":
      case "moderateDecrease":
        return "arrow-down" as const;
      case "unchanged":
      default:
        return null;
    }
  };

  const badgeVariant = getBadgeVariant(deltaType);
  const deltaIcon = getDeltaIcon(deltaType);

  return (
    <div>
      <div className="text-default text-sm">{title}</div>
      <div className="flex items-baseline justify-start space-x-3 truncate">
        <div className="text-emphasis text-2xl font-semibold">{valueFormatter(previousMetricData.count)}</div>
      </div>
      <div className="mt-4 flex items-center justify-start space-x-2">
        <Badge variant={badgeVariant} className="flex items-center gap-1">
          {deltaIcon && <Icon name={deltaIcon} className="h-3 w-3" />}
          {deltaValue}%
        </Badge>
        <div className="flex justify-start space-x-1 truncate">
          <Tooltip
            content={t("from_to_date_period", {
              startDate: previousDateRange.startDate,
              endDate: previousDateRange.endDate,
            })}>
            <small className="text-default relative top-px cursor-pointer text-xs">
              {t("from_last_period")}
            </small>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
