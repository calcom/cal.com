import { useId } from "@radix-ui/react-id";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";

import classNames from "@calcom/lib/classNames";

type RadioAreaProps = RadioGroupPrimitive.RadioGroupItemProps & {
  children: ReactNode;
  classNames?: { container?: string };
};

const RadioArea = ({ children, className, classNames: innerClassNames, ...props }: RadioAreaProps) => {
  const radioAreaId = useId();
  const id = props.id ?? radioAreaId;

  return (
    <div
      className={classNames(
        "borderClass relative flex items-start rounded-md border ", // Apply border class
        className
      )}
      style={{ marginBottom: "10px" }} // Add spacing between options
    >
      <RadioGroupPrimitive.Item
        id={id}
        {...props}
        className={classNames(
          "hover:bg-subtle disabled:hover:bg-default border-default focus:ring-emphasis mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border focus:ring-2 disabled:cursor-not-allowed",
          props.disabled && "opacity-60"
        )}
        style={{ marginRight: "10px" }} // Add spacing between radio button and label
      >
        <RadioGroupPrimitive.Indicator
          className={classNames(
            "dark:bg-inverted relative flex h-full w-full items-center justify-center rounded-md bg-black", // Square appearance
            props.disabled ? "bg-muted" : "bg-black"
          )}
        />
        <div className="absolute inset-0 cursor-pointer" />{" "}
        {/* Transparent overlay to make whole box selectable */}
      </RadioGroupPrimitive.Item>
      <label htmlFor={id} className={classNames("text-default", innerClassNames?.container)}>
        {children}
      </label>
    </div>
  );
};

const RadioAreaGroup = ({
  children,
  className,
  onValueChange,
  ...passThroughProps
}: RadioGroupPrimitive.RadioGroupProps) => {
  return (
    <RadioGroupPrimitive.Root className={className} onValueChange={onValueChange} {...passThroughProps}>
      {children}
    </RadioGroupPrimitive.Root>
  );
};

const Item = RadioArea;
const Group = RadioAreaGroup;

export { RadioArea, RadioAreaGroup, Item, Group };
