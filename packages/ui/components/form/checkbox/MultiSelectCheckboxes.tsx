import type { Dispatch, SetStateAction } from "react";
import React from "react";
import type { GroupBase, OptionProps } from "react-select";
import { components } from "react-select";
import type { Props } from "react-select";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Select } from "../select";

export type Option = {
  value: string;
  label: string;
};

const InputOption: React.FC<OptionProps<any, boolean, GroupBase<any>>> = ({
  isDisabled,
  isFocused,
  isSelected,
  children,
  innerProps,
  className,
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
        className="text-primary-600 focus:ring-primary-500 border-default h-4 w-4 rounded ltr:mr-2 rtl:ml-2"
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
};

const MultiValue = ({ index, getValue }: { index: number; getValue: any }) => {
  const { t } = useLocale();

  return <>{!index && <div>{t("nr_event_type", { count: getValue().length })}</div>}</>;
};

export default function MultiSelectCheckboxes({
  options,
  isLoading,
  selected,
  setSelected,
  setValue,
  className,
  isDisabled,
}: Omit<Props, "options"> & MultiSelectionCheckboxesProps) {
  const additonalComponents = { MultiValue };

  return (
    <Select
      value={selected}
      onChange={(s: any) => {
        setSelected(s);
        setValue(s);
      }}
      variant="checkbox"
      options={options}
      isMulti
      isDisabled={isDisabled}
      className={classNames(className ? className : "w-64 text-sm")}
      isSearchable={false}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      isLoading={isLoading}
      components={{
        ...additonalComponents,
        Option: InputOption,
      }}
    />
  );
}
