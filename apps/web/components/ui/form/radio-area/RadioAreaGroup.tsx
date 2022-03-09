import React, { ReactNode, useState } from "react";

import classNames from "@lib/classNames";

type RadioAreaProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  onChange?: (value: string) => void;
  defaultChecked?: boolean;
};

const RadioArea = (props: RadioAreaProps) => {
  return (
    <label
      className={classNames(
        "border-1 block border p-4 focus:outline-none focus:ring focus:ring-neutral-500",
        props.checked && "border-brand",
        props.className
      )}>
      <input
        onChange={(e) => {
          if (typeof props.onChange === "function") {
            props.onChange(e.target.value);
          }
        }}
        checked={props.checked}
        className="float-right ml-3 text-neutral-900 focus:ring-neutral-500"
        name={props.name}
        value={props.value}
        type="radio"
      />
      {props.children}
    </label>
  );
};

type ChildrenProps = {
  props: RadioAreaProps;
  children?: ReactNode;
};
interface RadioAreaGroupProps extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange"> {
  children: ChildrenProps | ChildrenProps[];
  name?: string;
  onChange?: (value: string) => void;
}

const RadioAreaGroup = ({ children, name, onChange, ...passThroughProps }: RadioAreaGroupProps) => {
  const [checkedIdx, setCheckedIdx] = useState<number | null>(null);

  const changeHandler = (value: string, idx: number) => {
    if (onChange) {
      onChange(value);
    }
    setCheckedIdx(idx);
  };

  return (
    <div {...passThroughProps}>
      {(Array.isArray(children) ? children : [children]).map((child, idx: number) => {
        if (checkedIdx === null && child.props.defaultChecked) {
          setCheckedIdx(idx);
        }
        return (
          <Item
            {...child.props}
            key={idx}
            name={name}
            checked={idx === checkedIdx}
            onChange={(value: string) => changeHandler(value, idx)}>
            {child.props.children}
          </Item>
        );
      })}
    </div>
  );
};

const Item = RadioArea;
const Group = RadioAreaGroup;

export { RadioArea, RadioAreaGroup, Item, Group };
