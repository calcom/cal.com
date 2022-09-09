import autoAnimate from "@formkit/auto-animate";
import React, { useEffect, useRef } from "react";
import { components, GroupBase, Props, ValueContainerProps } from "react-select";

// import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "../..";

const LimitedChipsContainer = <Option, IsMulti extends boolean, Group extends GroupBase<Option>>({
  children,
  ...props
}: ValueContainerProps<Option, IsMulti, Group>) => {
  if (!props.hasValue) {
    return <components.ValueContainer {...props}>{children as React.ReactNode[]}</components.ValueContainer>;
  }
  const CHIPS_LIMIT = 2;
  const [chips, other] = children;
  const overflowCounter = chips.slice(CHIPS_LIMIT).length;
  const displayChips = chips.slice(overflowCounter, overflowCounter + CHIPS_LIMIT);
  return (
    <components.ValueContainer {...props}>
      {displayChips}
      {overflowCounter > 0 && `+ ${overflowCounter} more`}
      {other}
    </components.ValueContainer>
  );
};

export const MultiDropdownSelect = ({ options = [], value = [], ...props }: Props) => {
  // const { t } = useLocale();
  const animationRef = useRef(null);

  useEffect(() => {
    animationRef.current && autoAnimate(animationRef.current);
  }, [animationRef]);

  return (
    <Select
      styles={{
        multiValueRemove: (base) => ({
          ...base,
          ":hover": {
            background: "transparent",
          },
        }),
        control: (base) => ({
          ...base,
          // Brute force to remove focus outline of input
          "& .cal-multiselect__input": {
            borderWidth: 0,
            boxShadow: "none",
            caretColor: "transparent",
          },
        }),
        valueContainer: (base) => ({
          ...base,
          display: "flex",
        }),
      }}
      className="cal-multiselect"
      classNamePrefix="cal-multiselect"
      placeholder="Select"
      defaultValue={value}
      options={options}
      hideSelectedOptions={false}
      isMulti
      components={{ ValueContainer: LimitedChipsContainer }}
      {...props}
    />
  );
};

export default MultiDropdownSelect;
