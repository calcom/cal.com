import React, { PropsWithChildren, useState } from "react";
import classNames from "@lib/classNames";

type RadioAreaProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onChange: (value: string) => void;
  defaultChecked: boolean;
};

const RadioArea = (props: RadioAreaProps) => {
  return (
    <label
      className={classNames(
        "block border border-1 p-4 focus:outline-none focus:ring focus:ring-neutral-500",
        props.checked && "border-black",
        props.className
      )}>
      <input
        onChange={(e) => props.onChange(e.target.value)}
        checked={props.checked}
        className="float-right text-neutral-900 focus:ring-neutral-500 ml-3"
        name={props.name}
        value={props.value}
        type="radio"
      />
      {props.children}
    </label>
  );
};

type RadioAreaGroupProps = {
  name?: string;
  onChange?: (value) => void;
};

const RadioAreaGroup = ({
  children,
  name,
  onChange,
  ...passThroughProps
}: PropsWithChildren<RadioAreaGroupProps>) => {
  const [checkedIdx, setCheckedIdx] = useState<number | null>(null);

  const changeHandler = (value: string, idx: number) => {
    if (onChange) {
      onChange(value);
    }
    setCheckedIdx(idx);
  };

  return (
    <div {...passThroughProps}>
      {(Array.isArray(children) ? children : [children]).map(
        (child: React.ReactElement<RadioAreaProps>, idx: number) => {
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
        }
      )}
    </div>
  );
};

const Item = RadioArea;
const Group = RadioAreaGroup;

export { RadioArea, RadioAreaGroup, Item, Group };
