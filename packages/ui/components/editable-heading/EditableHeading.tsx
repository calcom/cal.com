"use client";

import classNames from "classnames";
import { useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";

import { Icon } from "../icon";

export const EditableHeading = function EditableHeading({
  value,
  onChange,
  isReady,
  disabled = false,
  ...passThroughProps
}: {
  isReady?: boolean;
  disabled?: boolean;
} & Omit<JSX.IntrinsicElements["input"], "name" | "onChange"> &
  ControllerRenderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [initialValue] = useState(value);
  const enableEditing = () => setIsEditing(!disabled);

  const validateAndUpdateValue = (inputValue: string) => {
    if (!inputValue || !inputValue.trim()) {
      onChange(initialValue);
      return;
    }
    onChange(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    passThroughProps.onKeyDown?.(e);
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndUpdateValue(e.currentTarget.value);
      setIsEditing(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateAndUpdateValue(e.target.value);
    setIsEditing(false);
    passThroughProps.onBlur && passThroughProps.onBlur(e);
  };

  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="group pointer-events-auto relative truncate" onClick={enableEditing}>
      <div className={classNames(!disabled && "cursor-pointer", "flex items-center")}>
        <label className="min-w-8 relative inline-block">
          <span className="whitespace-pre text-xl tracking-normal text-transparent">{value}&nbsp;</span>
          <input
            {...passThroughProps}
            disabled={disabled}
            type="text"
            value={value}
            required
            className={classNames(
              !disabled &&
                "hover:text-default focus:text-emphasis cursor-pointer focus:outline-none focus:ring-0",
              "text-emphasis absolute left-0 top-0 w-full truncate border-none bg-transparent p-0 align-top text-xl ",
              passThroughProps.className
            )}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              setIsEditing(!disabled);
              passThroughProps.onFocus && passThroughProps.onFocus(e);
            }}
            onBlur={handleBlur}
            onChange={(e) => handleChange(e.target.value)}
          />
          {!isEditing && isReady && !disabled && (
            <Icon name="pencil" className="text-subtle group-hover:text-subtle -mt-px ml-1 inline h-3 w-3" />
          )}
        </label>
      </div>
    </div>
  );
};
