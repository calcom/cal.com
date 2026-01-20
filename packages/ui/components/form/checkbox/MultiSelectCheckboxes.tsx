import type { Dispatch, SetStateAction } from "react";
import React from "react";
import type {
  GroupBase,
  OptionProps,
  MultiValueProps,
  MultiValue as MultiValueType,
  SingleValue,
} from "react-select";
import { components } from "react-select";
import type { Props } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import { Select } from "../select";

export type Option = {
  value: string;
  label: string;
};

const InputOption: React.FC<OptionProps<Option, boolean, GroupBase<Option>>> = ({
  isDisabled,
  isFocused,
  isSelected,
  children,
  innerProps,
  ...rest
}) => {
  const props = {
    ...innerProps,
  };

  return (
    <components.Option
      {...rest}
      isDisabled={isDisabled}
      isFocused={isFocused}
      isSelected={isSelected}
      innerProps={props}>
      <input
        type="checkbox"
        className="text-emphasis focus:ring-emphasis dark:text-muted border-default h-4 w-4 rounded transition ltr:mr-2 rtl:ml-2"
        checked={isSelected}
        readOnly
      />
      {children}
    </components.Option>
  );
};

type MultiSelectionCheckboxesProps = {
  options: { label: string; value: string }[];
  setSelected: Dispatch<SetStateAction<Option[]>>;
  selected: Option[];
  setValue: (s: Option[]) => unknown;
  countText?: string;
};

const MultiValue = ({
  index,
  getValue,
  countText,
}: {
  index: number;
  getValue: () => readonly Option[];
  countText: string;
}) => {
  const { t } = useLocale();
  const count = getValue().filter((option) => option.value !== "all").length;
  return <>{!index && count !== 0 && <div>{t(countText, { count })}</div>}</>;
};

export default function MultiSelectCheckboxes({
  options,
  isLoading,
  selected,
  setSelected,
  setValue,
  className,
  isDisabled,
  countText,
}: Omit<Props, "options"> & MultiSelectionCheckboxesProps) {
  const additonalComponents = {
    MultiValue: (props: MultiValueProps<Option, boolean, GroupBase<Option>>) => (
      <MultiValue {...props} countText={countText || "selected"} />
    ),
  };

  const allOptions = [{ label: "Select all", value: "all" }, ...options];

  const allSelected = selected.length === options.length ? allOptions : selected;

  return (
    <Select
      value={allSelected}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={(s: MultiValueType<Option> | SingleValue<Option>, event: any) => {
        const allSelected = [];

        if (s !== null && Array.isArray(s) && s.length > 0) {
          if (s.find((option) => option.value === "all")) {
            if (event.action === "select-option") {
              allSelected.push(...[{ label: "Select all", value: "all" }, ...options]);
            } else {
              allSelected.push(...s.filter((option) => option.value !== "all"));
            }
          } else {
            if (s.length === options.length) {
              if (s.find((option) => option.value === "all")) {
                allSelected.push(...s.filter((option) => option.value !== "all"));
              } else {
                if (event.action === "select-option") {
                  allSelected.push(...[...s, { label: "Select all", value: "all" }]);
                }
              }
            } else {
              allSelected.push(...s);
            }
          }
        }

        setSelected(allSelected);
        setValue(allSelected);
      }}
      variant="checkbox"
      options={allOptions.length > 1 ? allOptions : []}
      innerClassNames={{ valueContainer: "font-medium", option: "font-medium" }}
      isMulti
      isDisabled={isDisabled}
      className={classNames(className ? className : "w-64 text-sm")}
      isSearchable={true}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      isLoading={isLoading}
      data-testid="multi-select-check-boxes"
      components={{
        ...additonalComponents,
        Option: InputOption,
      }}
    />
  );
}
