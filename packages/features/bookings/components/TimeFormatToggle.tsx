import type { JSX } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { ToggleGroup } from "@calcom/ui/components/form";

import { useTimePreferences } from "@calcom/features/bookings/lib";

export const TimeFormatToggle = ({ customClassName }: { customClassName?: string }): JSX.Element => {
  const timeFormat = useTimePreferences((state) => state.timeFormat);
  const setTimeFormat = useTimePreferences((state) => state.setTimeFormat);
  const { t } = useLocale();

  const handleValueChange = (newFormat: string): void => {
    if (newFormat && newFormat !== timeFormat) setTimeFormat(newFormat as TimeFormat);
  };

  return (
    <ToggleGroup
      customClassNames={customClassName}
      onValueChange={handleValueChange}
      defaultValue={timeFormat}
      value={timeFormat}
      options={[
        { value: TimeFormat.TWELVE_HOUR, label: t("12_hour_short") },
        { value: TimeFormat.TWENTY_FOUR_HOUR, label: t("24_hour_short") },
      ]}
    />
  );
};
