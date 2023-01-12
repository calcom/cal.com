import React from "react";
import { Props } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

import Avatar from "@components/ui/Avatar";
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
        <div key={option.value} className="border-1 border p-2 font-medium">
          <Avatar
            className="inline h-6 w-6 rounded-full ltr:mr-2 rtl:ml-2"
            imageSrc={option.avatar}
            alt={option.label}
          />
          {option.label}
          <Icon.FiX
            onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
            className="float-right mt-0.5 h-5 w-5 cursor-pointer text-gray-500"
          />
        </div>
      ))}
    </>
  );
};

export default CheckedSelect;
