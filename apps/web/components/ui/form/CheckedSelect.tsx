import React from "react";
import type { Props } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui";
import { FiX } from "@calcom/ui/components/icon";

import Select from "@components/ui/form/Select";

type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  disabled?: boolean;
};

export const CheckedSelect = ({
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
      {value.map((option) => (
        <div key={option.value} className="border p-2 font-medium">
          <Avatar
            className="inline ltr:mr-2 rtl:ml-2"
            size="sm"
            imageSrc={option.avatar}
            alt={option.label}
          />
          {option.label}
          <FiX
            onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
            className="text-subtle float-right mt-0.5 h-5 w-5 cursor-pointer"
          />
        </div>
      ))}
    </>
  );
};

export default CheckedSelect;
