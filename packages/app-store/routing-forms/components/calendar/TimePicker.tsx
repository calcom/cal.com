"use client";

import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Select } from "@calcom/ui/components/form";

type TimePickerProps = {
  selectedTime: string | null;
  timeslots: string[];
  onChange: (time: string) => void;
  disabled?: boolean;
  variant?: "default" | "underline";
  underlineColor?: string;
  placeholder?: string;
};

export default function TimePicker({
  selectedTime,
  timeslots,
  onChange,
  disabled,
  variant = "default",
  underlineColor,
  placeholder,
}: TimePickerProps) {
  const options = useMemo(
    () =>
      timeslots.map((time) => ({
        label: dayjs(time).format("HH:mm"),
        value: time,
      })),
    [timeslots]
  );

  const selectedOption = options.find((opt) => opt.value === selectedTime) ?? null;
  const isDisabled = disabled || options.length === 0;
  const isUnderline = variant === "underline";
  const isUnderlineDisabled = isUnderline && isDisabled;
  const resolvedUnderlineColor = isUnderlineDisabled
    ? "var(--cal-border-muted)"
    : underlineColor ?? "var(--cal-secondary)";
  const underlineSelectStyles = isUnderline
    ? {
        control: (base: any) => ({
          ...base,
          borderBottomColor: resolvedUnderlineColor,
          borderColor: resolvedUnderlineColor,
        }),
      }
    : undefined;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option?.value ?? "")}
      isDisabled={isDisabled}
      variant={isUnderline ? "underline" : "default"}
      styles={underlineSelectStyles}
      innerClassNames={
        isUnderlineDisabled
          ? {
              control: "disabled:opacity-100 disabled:text-default",
            }
          : undefined
      }
      placeholder={placeholder || "Pick a time"}
    />
  );
}
