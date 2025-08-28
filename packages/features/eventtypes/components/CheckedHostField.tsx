import React from "react";
import type { Options } from "react-select";

import { Label } from "@calcom/ui/components/form";

import type { CheckedSelectOption } from "./CheckedTeamSelect";
import type { CheckedTeamSelectCustomClassNames } from "./CheckedTeamSelect";
import { CheckedTeamSelect } from "./CheckedTeamSelect";

export default function CheckedHostField({
  labelText,
  placeholder,
  isFixed,
  value,
  onChange,
  options = [],
  helperText,
  isRRWeightsEnabled,
  groupId,
  customClassNames,
  ...rest
}: {
  labelText?: string;
  placeholder: string;
  isFixed: boolean;
  value: CheckedSelectOption[];
  onChange?: (options: CheckedSelectOption[]) => void;
  options?: Options<CheckedSelectOption>;
  helperText?: React.ReactNode | string;
  isRRWeightsEnabled?: boolean;
  groupId: string | null;
  customClassNames?: CheckedTeamSelectCustomClassNames;
} & Omit<Partial<React.ComponentProps<typeof CheckedTeamSelect>>, "onChange" | "value">) {
  return (
    <div className="flex flex-col rounded-md">
      <div>
        {labelText ? <Label>{labelText}</Label> : null}
        <CheckedTeamSelect
          isOptionDisabled={(option) =>
            !!value.find((host: any) => (host.userId as number | undefined)?.toString() === option.value)
          }
          onChange={(options) => {
            onChange &&
              onChange(
                options.map((option: CheckedSelectOption) => ({
                  isFixed,
                  userId: parseInt(option.value, 10),
                  priority: option.priority ?? 2,
                  weight: option.weight ?? 100,
                  scheduleId: option.defaultScheduleId,
                  groupId: option.groupId,
                  label: option.label,
                  value: option.value,
                  avatar: option.avatar ?? "",
                })) as unknown as CheckedSelectOption[]
              );
          }}
          value={(value || [])
            .filter(({ isFixed: _isFixed }) => isFixed === _isFixed)
            .reduce((acc: CheckedSelectOption[], host: any) => {
              const option = options.find(
                (member: CheckedSelectOption) => member.value === host.userId?.toString()
              );
              if (!option) return acc;
              acc.push({
                ...option,
                priority: host.priority ?? 2,
                isFixed,
                weight: host.weight ?? 100,
                groupId: host.groupId,
              });
              return acc;
            }, [])}
          controlShouldRenderValue={false}
          options={options}
          placeholder={placeholder}
          isRRWeightsEnabled={isRRWeightsEnabled}
          customClassNames={customClassNames}
          groupId={groupId}
          {...rest}
        />
      </div>
    </div>
  );
}
