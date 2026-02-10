"use client";

import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
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
  const [previousValue, setPreviousValue] = useState(value);

  useEffect(() => {
    setPreviousValue(value);
  }, [value]);

  const inputRef = useRef<HTMLInputElement>(null);
  const enableEditing = () => setIsEditing(!disabled);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim();
    
    if (!trimmedValue || trimmedValue.length === 0) {
      if (onChange && previousValue) {
        onChange(previousValue);
      }
    } else {
      setPreviousValue(trimmedValue);
    }
    
    setIsEditing(false);
    if (passThroughProps.onBlur) {
      passThroughProps.onBlur(e);
    }
  };

  return (
    <div className="group pointer-events-auto relative truncate" onClick={enableEditing}>
      <div className={classNames(!disabled && "cursor-pointer", "flex items-center")}>
        <label className="min-w-8 relative inline-block">
          <span
            className={classNames(
              "whitespace-pre text-xl tracking-normal w-full truncate cursor-pointer",
              isEditing && "text-transparent"
            )}
          >
            {value}
          </span>

          <input
            {...passThroughProps}
            ref={inputRef}
            disabled={disabled}
            type="text"
            value={value}
            required
            className={classNames(
              !disabled && "hover:text-default focus:text-emphasis cursor-text",
              "text-emphasis absolute left-0 top-0 w-full truncate border-none bg-transparent p-0 align-top text-xl transition-opacity",
              isEditing ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
              passThroughProps.className
            )}
            onFocus={(e) => {
              setIsEditing(!disabled);
              passThroughProps.onFocus?.(e);
            }}
            onBlur={handleBlur}
            onChange={(e) => onChange?.(e.target.value)}
          />
          {!isEditing && isReady && !disabled && (
            <Icon name="pencil" className="text-subtle group-hover:text-subtle -mt-px ml-1 inline h-4 w-4" />
          )}
        </label>
      </div>
    </div>
  );
};
