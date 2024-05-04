import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";
import React from "react";

import classNames from "@calcom/lib/classNames";

export const Group = (props: RadioGroupPrimitive.RadioGroupProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Root {...props}>{props.children}</RadioGroupPrimitive.Root>
);

export const Radio = (props: RadioGroupPrimitive.RadioGroupItemProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Item
    {...props}
    className={classNames(
      "borderClass border-default dark:checked:bg-brand-default dark:bg-darkgray-100 dark:hover:bg-subtle dark:checked:hover:bg-brand-default focus:ring-brand-default hover:border-emphasis relative me-1.5 mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border text-[--cal-brand] focus:border-0 focus:ring-1",
      props.disabled && "opacity-60",
      props.checked && "checked"
    )}>
    {props.children}
    {/* Transparent overlay to make whole box selectable */}
  </RadioGroupPrimitive.Item>
);

export const Indicator = ({ disabled }: { disabled?: boolean }) => (
  <RadioGroupPrimitive.Indicator
    className={classNames(
      "after:bg-default dark:after:bg-brand-accent relative flex h-full w-full items-center justify-center rounded-full bg-black after:h-[6px] after:w-[6px] after:rounded-full after:content-['']",
      disabled ? "after:bg-muted" : "bg-brand-default"
    )}
  />
);

export const Label = (props: JSX.IntrinsicElements["label"] & { disabled?: boolean; checked?: boolean }) => {
  const { children, ...rest } = props;

  // Function to render label text with new lines
  const renderLabelText = (text: string) => {
    return text.split("<br>").map((line, index) => {
      const isBig = line.includes("<big>");
      const formattedLine = isBig ? line.replace("<big>", "").replace("</big>", "") : line;

      return (
        <span key={index} style={{ fontSize: isBig ? "larger" : "inherit" }}>
          {formattedLine}
          {index < text.split("<br>").length - 1 && <br />} {/* Add <br> if not the last line */}
        </span>
      );
    });
  };

  return (
    <label
      {...rest}
      className={classNames(
        "poppins-regular text-emphasis ms-2 w-full text-sm font-medium leading-5",
        props.disabled && "text-subtle",
        props.checked && "font-bold" // Apply font-bold class if checked
      )}
      style={{ whiteSpace: "pre-line" }} // Preserve newline characters and render them as line breaks
    >
      {/* Google Fonts import */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Jaro:opsz@6..72&family=Raleway:ital,wght@0,100..900;1,100..900&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
        `}
      </style>

      {/* Render label text */}
      {typeof children === "string" ? renderLabelText(children) : children}
    </label>
  );
};

export const RadioField = ({
  label,
  disabled,
  id,
  value,
  className,
  checked,
}: {
  label: string | ReactNode;
  disabled?: boolean;
  id: string;
  value: string;
  className?: string;
  checked?: boolean;
}) => (
  <div className={classNames("borderClass flex items-start", className)} style={{ marginBottom: "0.5rem" }}>
    <Radio value={value} disabled={disabled} id={id} checked={checked}>
      <Indicator disabled={disabled} />
    </Radio>
    <Label htmlFor={id} disabled={disabled} checked={checked}>
      {label}
    </Label>
  </div>
);
