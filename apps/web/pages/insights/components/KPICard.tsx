import { Card, Flex, Text, Metric, BadgeDelta } from "@tremor/react";

import { Tooltip } from "@calcom/ui";

import { CalculateDeltaType, colors, valueFormatter } from "../index";

const KPICard = ({
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
  return (
    <Card key={title}>
      <Text>{title}</Text>
      <Flex className="items-baseline justify-start space-x-3 truncate">
        <Metric>{valueFormatter(previousMetricData.count)}</Metric>
      </Flex>
      <Flex className="mt-4 justify-start space-x-2">
        <BadgeDelta
          deltaType={CalculateDeltaType(previousMetricData.deltaPrevious - previousMetricData.count)}
        />
        <Flex className="justify-start space-x-1 truncate">
          <Text
            color={colors[CalculateDeltaType(previousMetricData.deltaPrevious - previousMetricData.count)]}>
            {Number(previousMetricData.deltaPrevious).toFixed(0)}%
          </Text>

          <Tooltip content={`From: ${previousDateRange.startDate} To: ${previousDateRange.endDate}`}>
            <small className="relative top-px text-xs text-gray-600">from last period</small>
          </Tooltip>
        </Flex>
      </Flex>
    </Card>
  );
};

export { KPICard };
