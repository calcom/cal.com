import type { ComponentProps } from "react";
import type { Options } from "react-select";

import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";

type OptionalTeamGuestsProps = {
  value: { id: number }[];
  onChange?: (options: { id: number }[]) => void;
  options?: Options<CheckedSelectOption>;
} & Omit<Partial<ComponentProps<typeof CheckedTeamSelect>>, "onChange" | "value">;

const OptionalTeamGuests = ({ onChange, options, value }: OptionalTeamGuestsProps) => {
  return (
    <CheckedTeamSelect
      onChange={(options) => {
        if (!onChange) return;
        onChange(options.map((option) => ({ id: parseInt(option.value) })));
      }}
      value={(value || []).reduce((acc, host) => {
        const option = options?.find((member) => member.value === host.id.toString());
        if (!option) return acc;

        acc.push({ value: option.value, avatar: option.avatar, label: option.label, isFixed: true });
        return acc;
      }, [] as CheckedSelectOption[])}
      options={options}
      controlShouldRenderValue={false}
    />
  );
};

export default OptionalTeamGuests;
