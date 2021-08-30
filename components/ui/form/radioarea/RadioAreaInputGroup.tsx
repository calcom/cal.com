import React, { PropsWithChildren, useState } from "react";
import { RadioAreaInput, RadioAreaInputProps } from "@components/ui/form/radioarea/RadioAreaInput";

const GROUP_DEFAULT_TAG = "div";

export type RadioAreaInputGroupProps = {
  as?: string;
  name?: string;
};

export const RadioAreaInputGroup = function RadioAreaInputGroup({
  as: Comp = GROUP_DEFAULT_TAG,
  children,
  name,
  onChange,
  ...passThroughProps
}: PropsWithChildren<RadioAreaInputGroupProps>) {
  const [checkedIdx, setCheckedIdx] = useState<number | null>(null);

  const changeHandler = (e: { value: string; label: string }, idx: number) => {
    if (onChange) {
      onChange(e);
    }
    setCheckedIdx(idx);
  };

  return (
    <Comp {...passThroughProps}>
      {children.map((child: React.ReactElement<RadioAreaInputProps>, idx: number) => {
        if (checkedIdx === null && child.props.defaultChecked) {
          setCheckedIdx(idx);
        }
        return (
          <RadioAreaInput
            {...child.props}
            key={idx}
            name={name}
            checked={idx === checkedIdx}
            onChange={(value: string) => changeHandler({ value, label: child.props.label }, idx)}>
            {child.props.children}
          </RadioAreaInput>
        );
      })}
    </Comp>
  );
};

export default RadioAreaInputGroup;
