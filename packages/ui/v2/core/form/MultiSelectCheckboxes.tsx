import React, { Dispatch, SetStateAction } from "react";
import { components, GroupBase, OptionProps } from "react-select";
import { Props } from "react-select";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Select } from "../../../components/form/select";

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
      className={classNames(
        className,
        "dark:bg-darkgray-100 !flex !cursor-pointer !py-3 text-[inherit]",
        isFocused && "dark:!bg-darkgray-200 !bg-gray-100",
        isSelected && "dark:!bg-darkgray-300 !bg-neutral-900"
      )}
      {...rest}
      isDisabled={isDisabled}
      isFocused={isFocused}
      isSelected={isSelected}
      innerProps={props}>
      <input
        type="checkbox"
        className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300 ltr:mr-2 rtl:ml-2"
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
}: Omit<Props, "options"> & MultiSelectionCheckboxesProps) {
  const additonalComponents = { MultiValue };

  return (
    <Select
      value={selected}
      onChange={(s: any) => {
        setSelected(s);
        setValue(s);
      }}
      options={options}
      isMulti
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
