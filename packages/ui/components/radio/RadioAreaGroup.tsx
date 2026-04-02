import classNames from "@calcom/ui/classNames";
import { useId } from "@radix-ui/react-id";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";

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
        "border-subtle [&:has(input:checked)]:border-emphasis relative flex items-start rounded-[10px] border ",
        className
      )}>
      <RadioGroupPrimitive.Item
        id={id}
        {...props}
        className={classNames(
          "hover:bg-subtle disabled:hover:bg-default border-default focus:ring-emphasis absolute left-3 top-[0.9rem] mt-0.5 h-4 w-4 shrink-0 rounded-full border transition focus:ring-2 disabled:cursor-not-allowed",
          props.disabled && "opacity-60"
        )}>
        <RadioGroupPrimitive.Indicator
          className={classNames(
            "after:bg-default dark:after:bg-inverted relative flex h-full w-full items-center justify-center rounded-full bg-black after:h-[6px] after:w-[6px] after:rounded-full after:content-['']",
            props.disabled ? "after:bg-cal-muted" : "bg-black"
          )}
        />
      </RadioGroupPrimitive.Item>
      <label htmlFor={id} className={classNames("text-default p-4 pl-10 pt-3", innerClassNames?.container)}>
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
const Root = RadioGroupPrimitive.Root;

export { RadioArea, RadioAreaGroup, Item, Group, Root };
