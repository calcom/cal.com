import classNames from "@lib/classNames";
import React, { useRef } from "react";

export type RadioAreaInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onChange: (value: string) => void;
};

export const RadioAreaInput = function RadioAreaInput(props: RadioAreaInputProps) {
  const radioRef = useRef<HTMLInputElement>();

  const handleFocus = () => window.addEventListener("keypress", handleKeyPress);
  const handleBlur = () => window.removeEventListener("keypress", handleKeyPress);

  const handleKeyPress = (e) => {
    if ((e.key === " " || e.key === "Enter") && radioRef.current) {
      //  props.onChange(radioRef.current.value);
    }
  };

  return (
    <label
      tabIndex="0"
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={classNames(
        "block border border-1 p-4 focus:outline-none focus:ring focus:ring-neutral-500",
        props.checked && "border-black",
        props.className
      )}>
      <input
        ref={radioRef}
        tabIndex="-1"
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
