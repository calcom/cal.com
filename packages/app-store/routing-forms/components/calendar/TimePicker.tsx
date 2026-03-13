"use client";

import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Select } from "@calcom/ui/components/form";

type TimePickerProps = {
  selectedTime: string | null;
  timeslots: string[];
  onChange: (time: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function TimePicker({
  selectedTime,
  timeslots,
  onChange,
  disabled,
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

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option?.value ?? "")}
      isDisabled={disabled || options.length === 0}
      placeholder={placeholder || "Pick a time"}
    />
  );
}

