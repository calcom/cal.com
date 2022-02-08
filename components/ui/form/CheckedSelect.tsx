import { CheckIcon, XIcon } from "@heroicons/react/outline";
import React, { ForwardedRef, useEffect, useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";

import Avatar from "@components/ui/Avatar";
import Select from "@components/ui/form/Select";

type CheckedSelectValue = {
  avatar: string;
  label: string;
  value: string;
}[];

export type CheckedSelectProps = {
  defaultValue?: CheckedSelectValue;
  placeholder?: string;
  name?: string;
  options: CheckedSelectValue;
  onChange: (options: CheckedSelectValue) => void;
  disabled: boolean;
};

export const CheckedSelect = React.forwardRef((props: CheckedSelectProps, ref: ForwardedRef<unknown>) => {
  const [selectedOptions, setSelectedOptions] = useState<CheckedSelectValue>(props.defaultValue || []);
  const { t } = useLocale();

  useEffect(() => {
    props.onChange(selectedOptions);
  }, [selectedOptions]);

  const formatOptionLabel = ({ label, avatar, disabled }) => (
    <div className="flex">
      <Avatar className="mr-3 h-6 w-6 rounded-full" displayName={label} imageSrc={avatar} />
      {label}
      {disabled && (
        <div className="flex-grow">
          <CheckIcon className="float-right h-6 w-6 text-neutral-500" />
        </div>
      )}
    </div>
  );

  const options = props.options.map((option) => ({
    ...option,
    disabled: !!selectedOptions.find((selectedOption) => selectedOption.value === option.value),
  }));

  const removeOption = (value: string) =>
    setSelectedOptions(selectedOptions.filter((option) => option.value !== value));

  const changeHandler = (selections) =>
    selections.forEach((selected) => {
      if (selectedOptions.find((option) => option.value === selected.value)) {
        removeOption(selected.value);
        return;
      }
      setSelectedOptions(selectedOptions.concat(selected));
    });

  return (
    <>
      <Select
        ref={ref}
        styles={{
          option: (styles, { isDisabled }) => ({
            ...styles,
            backgroundColor: isDisabled ? "#F5F5F5" : "inherit",
          }),
        }}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={false}
        formatOptionLabel={formatOptionLabel}
        options={options}
        isMulti
        value={props.placeholder || t("select")}
        onChange={changeHandler}
      />
      {selectedOptions.map((option) => (
        <div key={option.value} className="border-1 border p-2 font-medium">
          <Avatar
            className="inline h-6 w-6 rounded-full ltr:mr-2 rtl:ml-2"
            imageSrc={option.avatar}
            displayName={option.label}
          />
          {option.label}
          <XIcon
            onClick={() => changeHandler([option])}
            className="float-right mt-0.5 h-5 w-5 cursor-pointer text-neutral-500"
          />
        </div>
      ))}
    </>
  );
});

CheckedSelect.displayName = "CheckedSelect";

export default CheckedSelect;
