import type { Key } from "react";
import type { SingleValue } from "react-select";

import { TextField, Select, Button } from "@calcom/ui";
import { Trash2 } from "@calcom/ui/components/icon";

import { INTERVAL_LIMIT_OPTIONS } from "../../lib/limitsUtils";
import type { IntervalLimit, IntervalLimitsKey } from "../../types";

type IntervalLimitItemProps = {
  key: Key;
  limitKey: IntervalLimitsKey;
  step: number;
  value: number;
  textFieldSuffix?: string;
  disabled?: boolean;
  selectOptions: { value: keyof IntervalLimit; label: string }[];
  hasDeleteButton?: boolean;
  onDelete: (intervalLimitsKey: IntervalLimitsKey) => void;
  onLimitChange: (intervalLimitsKey: IntervalLimitsKey, limit: number) => void;
  onIntervalSelect: (interval: SingleValue<{ value: keyof IntervalLimit; label: string }>) => void;
};

export function IntervalLimitItem({
  limitKey,
  step,
  value,
  textFieldSuffix,
  selectOptions,
  hasDeleteButton,
  disabled,
  onDelete,
  onLimitChange,
  onIntervalSelect,
}: IntervalLimitItemProps) {
  return (
    <div className="mb-4 flex max-h-9 items-center space-x-2 text-sm rtl:space-x-reverse" key={limitKey}>
      <TextField
        required
        type="number"
        containerClassName={textFieldSuffix ? "w-44 -mb-1" : "w-16 mb-0"}
        className="mb-0"
        placeholder={`${value}`}
        disabled={disabled}
        min={step}
        step={step}
        defaultValue={value}
        addOnSuffix={textFieldSuffix}
        onChange={(e) => onLimitChange(limitKey, parseInt(e.target.value || "0", 10))}
      />
      <Select
        options={selectOptions}
        isSearchable={false}
        isDisabled={disabled}
        defaultValue={INTERVAL_LIMIT_OPTIONS.find((option) => option.value === limitKey)}
        onChange={onIntervalSelect}
        className="w-36"
      />
      {hasDeleteButton && !disabled && (
        <Button
          variant="icon"
          StartIcon={Trash2}
          color="destructive"
          className="border-none"
          onClick={() => onDelete(limitKey)}
        />
      )}
    </div>
  );
}
