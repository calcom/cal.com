"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form";

const REMINDER_OPTIONS = [
  { value: 0, label: "just_in_time" },
  { value: 10, label: "remind_minutes_before" },
  { value: 30, label: "remind_minutes_before" },
  { value: 60, label: "remind_minutes_before" },
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
    label: opt.label === "just_in_time" ? t(opt.label) : t(opt.label, { count: opt.value }),
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
