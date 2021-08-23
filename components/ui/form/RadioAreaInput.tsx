import classNames from "@lib/classNames";
import React, {ForwardedRef, useEffect, useState} from "react";

type HTMLInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export type RadioAreaInputProps = {
  name: string;
} & HTMLInputProps;

export const RadioAreaInput = function RadioAreaInput(props: RadioAreaInputProps) {

  return (
    <label
      className={classNames(
        "block border border-1 p-4",
        props.checked && "border-black",
        props.className
      )}
    >
      <input
        onChange={props.onChange}
        checked={props.checked}
        className="float-right text-neutral-900 focus:ring-neutral-500 ml-3"
        name={props.name}
        value={props.value}
        type="radio"
      />
      {props.children}
    </label>
  )
}

const GROUP_DEFAULT_TAG: string = "div";

export type RadioAreaInputGroupProps = {
  as?: string;
  children?: React.ReactElement[];
  name?: string;
};

export const RadioAreaInputGroup = function RadioAreaInputGroup({
  as: Comp = GROUP_DEFAULT_TAG,
  children,
  name,
  onChange,
  ...passThroughProps
}: RadioAreaInputGroupProps) {
  const [ checkedIdx, setCheckedIdx ] = useState<number | null>(null);

  const changeHandler = (value: string, idx: number) => {
    if (onChange) {
      onChange(value);
    }
    setCheckedIdx(idx);
  };

  return <Comp {...passThroughProps}>
    {children.map( (child: React.ReactElement<RadioAreaInputProps>, idx: number) => {
      return (
        <RadioAreaInput
          {...child.props}
          key={idx}
          name={name}
          checked={checkedIdx ? idx === checkedIdx : child.props.defaultChecked}
          onChange={(e) => changeHandler(e.target.value, idx)}
        >
          {child.props.children}
        </RadioAreaInput>
      );
    })}
  </Comp>;
};
