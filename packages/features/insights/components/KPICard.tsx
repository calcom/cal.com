import { Flex, Text, Metric, BadgeDelta } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui";

import { calculateDeltaType, colors, valueFormatter } from "../lib";
import { CardInsights } from "./Card";

export const KPICard = ({
  title,
  previousMetricData,
  previousDateRange,
}: {
  title: string;
  value: number;
  previousMetricData: {
    count: number;
    deltaPrevious: number;
  };
  previousDateRange: { startDate: string; endDate: string };
}) => {
  const { t } = useLocale();
  return (
    <CardInsights key={title}>
      <Text className="text-default">{title}</Text>
      <Flex className="items-baseline justify-start space-x-3 truncate">
        <Metric className="text-emphasis">{valueFormatter(previousMetricData.count)}</Metric>
      </Flex>
      <Flex className="mt-4 justify-start space-x-2">
        <BadgeDelta
          deltaType={calculateDeltaType(previousMetricData.deltaPrevious - previousMetricData.count)}
        />
        <Flex className="justify-start space-x-1 truncate">
          <Text
            color={colors[calculateDeltaType(previousMetricData.deltaPrevious - previousMetricData.count)]}>
            {Number(previousMetricData.deltaPrevious).toFixed(0)}%
          </Text>

          <Tooltip
            content={t("from_to_date_period", {
              startDate: previousDateRange.startDate,
              endDate: previousDateRange.endDate,
            })}>
            <small className="text-default relative top-px cursor-pointer text-xs">
              {t("from_last_period")}
            </small>
          </Tooltip>
        </Flex>
      </Flex>
    </CardInsights>
  );
};
