"use client";

import { useState, useEffect, useMemo } from "react";

import type { ConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Select } from "@calcom/ui/components/form";

export type DestinationReminderSelectorProps = {
  destinationCalendar: ConnectedDestinationCalendars["destinationCalendar"];
  onReminderChange?: (value: { credentialId: number; integration: string; defaultReminder: number }) => void;
};

export const DestinationReminderSelector = ({
  destinationCalendar,
  onReminderChange,
}: DestinationReminderSelectorProps): JSX.Element | null => {
  const { t } = useLocale();

  // Reminder options
  const memoOptions = useMemo(
    () => [
      { label: t("remind_minutes_before", { count: 10 }), value: 10 },
      { label: t("remind_minutes_before", { count: 30 }), value: 30 },
      { label: t("remind_minutes_before", { count: 60 }), value: 60 },
    ],
    [t]
  );

  // Selected option state
  const [selectedOption, setSelectedOption] = useState<{
    value: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (destinationCalendar && destinationCalendar.customCalendarReminder) {
      const defaultOption = memoOptions.find(
        (option) => option.value === destinationCalendar.customCalendarReminder
      );
      setSelectedOption(defaultOption || null);
    } else {
      setSelectedOption(null);
    }
  }, [destinationCalendar, memoOptions]);

  return (
    <div
      className="relative table w-full table-fixed"
      title={`${t("reminder")}: ${selectedOption?.label || ""}`}>
      <Select
        name="reminderSelector"
        placeholder={`${t("reminder")}`}
        options={memoOptions}
        isSearchable={false}
        className={classNames("border-default my-2 block w-full min-w-0 flex-1 rounded-md text-sm")}
        onChange={(event) => {
          const reminderValue = event?.value || 10;

          if (!destinationCalendar?.credentialId || !destinationCalendar?.integration || !onReminderChange)
            return;

          onReminderChange({
            credentialId: destinationCalendar.credentialId,
            integration: destinationCalendar.integration,
            defaultReminder: reminderValue,
          });

          setSelectedOption(memoOptions.find((option) => option.value === reminderValue) || null);
        }}
        value={selectedOption}
        isMulti={false}
      />
    </div>
  );
};
