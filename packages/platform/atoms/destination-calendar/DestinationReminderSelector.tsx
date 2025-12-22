"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form";

const REMINDER_OPTIONS = [
  { value: 10, labelKey: "remind_minutes_before" },
  { value: 30, labelKey: "remind_minutes_before" },
  { value: 60, labelKey: "remind_minutes_before" },
];

interface DestinationReminderSelectorProps {
  value: number;
  onChange: (value: number) => void;
  isPending?: boolean;
}

export const DestinationReminderSelector = ({
  value,
  onChange,
  isPending,
}: DestinationReminderSelectorProps) => {
  const { t } = useLocale();

  const options = REMINDER_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey, { count: opt.value }),
  }));

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <Select
      name="reminderDuration"
      options={options}
      value={selectedOption}
      onChange={(newValue) => {
        if (newValue) {
          onChange(newValue.value);
        }
      }}
      isLoading={isPending}
      isSearchable={false}
      className="mt-2 block w-full text-sm"
    />
  );
};
