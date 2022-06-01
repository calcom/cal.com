import React from "react";
import { components, GroupBase, OptionProps, ValueContainerProps } from "react-select";

import Select from "@calcom/ui/form/Select";

import { useLocale } from "@lib/hooks/useLocale";

export type Option = {
  value: string;
  label: string;
};

const ValueContainer = ({ children, ...props }: ValueContainerProps<Option>) => {
  const { t } = useLocale();
  let [values] = children as any;

  if (Array.isArray(values)) {
    values = `${values.length} ${t("event_type")}`; //improve plural form
  }

  return <components.ValueContainer {...props}>{values}</components.ValueContainer>;
};

const InputOption = ({
  isDisabled,
  isFocused,
  isSelected,
  children,
  innerProps,
  ...rest
}: OptionProps<any, boolean, GroupBase<any>>) => {
  const style = {
    alignItems: "center",
    backgroundColor: isFocused ? "rgba(244, 245, 246, var(--tw-bg-opacity))" : "transparent",
    color: "inherit",
    display: "flex ",
  };

  const props = {
    ...innerProps,
    style,
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
        className="text-primary-600 focus:ring-primary-500 mr-2 h-4 w-4 rounded border-gray-300"
        checked={isSelected}
      />
      {children}
    </components.Option>
  );
};

export default function MultiSelectCheckboxes() {
  const [selected, setSelected] = React.useState<Option[]>([]);
  const options: Option[] = [
    { value: "Event Type 1", label: "Event Type 1" },
    { value: "Event Type 2", label: "Event Type 2" },
    { value: "Event Type 3", label: "Event Type 3" },
  ];

  return (
    <Select
      value={selected}
      onChange={(s: any) => setSelected(s)}
      options={options}
      isMulti
      className="w-64 text-sm"
      isSearchable={false}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      components={{
        ValueContainer,
        Option: InputOption,
      }}
    />
  );
}
