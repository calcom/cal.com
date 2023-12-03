import { Flex, Text, Metric } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { valueFormatter } from "../lib/valueFormatter";
import { CardInsights } from "./Card";

export const TimeOfDayCard = ({ title, value }: { title: string; value: number }) => {
  const { t } = useLocale();
  return (
    <CardInsights key={title}>
      <Text className="text-default">{title}</Text>
      <Flex className="items-baseline justify-start space-x-3 truncate">
        <Metric className="text-emphasis">{valueFormatter(value)}</Metric>
      </Flex>
    </CardInsights>
  );
};
