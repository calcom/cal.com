import React from "react";
import { Props } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";

import { Avatar, Select } from "../..";

type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  disabled?: boolean;
};

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
}) => {
  const { t } = useLocale();
  return (
    <>
      <Select
        styles={{
          option: (styles, { isDisabled }) => ({
            ...styles,
            backgroundColor: isDisabled ? "#F5F5F5" : "inherit",
          }),
        }}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={false}
        options={options}
        value={value}
        isMulti
        {...props}
      />
      <div className="mt-3 rounded-md border">
        {value.map((option) => (
          <div key={option.value} className="flex border-b py-2 px-3">
            <div className="mr-3">
              <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
            </div>
            <p className="my-auto text-sm text-gray-900">{option.label}</p>
            <Icon.FiX
              onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
              className="my-auto ml-auto"
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default CheckedTeamSelect;
