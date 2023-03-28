import { Card, Flex, Text, Metric, BadgeDelta } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui";

import { calculateDeltaType, colors, valueFormatter } from "../lib";

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
    <Card key={title}>
      <Text>{title}</Text>
      <Flex className="items-baseline justify-start space-x-3 truncate">
        <Metric>{valueFormatter(previousMetricData.count)}</Metric>
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
            <small className="relative top-px text-xs text-gray-600">{t("from_last_period")}</small>
          </Tooltip>
        </Flex>
      </Flex>
    </Card>
  );
};
