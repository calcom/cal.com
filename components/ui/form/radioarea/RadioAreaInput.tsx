import classNames from "@lib/classNames";
import React from "react";

export type RadioAreaInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onChange: (value: string) => void;
};

export const RadioAreaInput = function RadioAreaInput(props: RadioAreaInputProps) {
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

export default RadioAreaInput;
