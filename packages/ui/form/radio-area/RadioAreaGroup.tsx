import React from "react";

import classNames from "@calcom/lib/classNames";

type RadioAreaProps = React.InputHTMLAttributes<HTMLInputElement>;

const RadioArea = React.forwardRef<HTMLInputElement, RadioAreaProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <label className={classNames("relative flex", className)}>
        <input
          ref={ref}
          className="peer absolute top-[0.9rem] left-3 align-baseline text-gray-900 focus:ring-neutral-500"
          type="radio"
          {...props}
        />
        <div className="peer-checked:border-brand rounded-md border p-4 pt-3 pl-10 focus:outline-none focus:ring focus:ring-neutral-500">
          {children}
        </div>
      </label>
    );
  }
);
type MaybeArray<T> = T[] | T;
type ChildrenOfType<T extends React.ElementType> = MaybeArray<
  React.ReactElement<React.ComponentPropsWithoutRef<T>>
>;
interface RadioAreaGroupProps extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange" | "children"> {
  onChange?: (value: string) => void;
  children: ChildrenOfType<typeof RadioArea>;
}

const RadioAreaGroup = ({ children, className, onChange, ...passThroughProps }: RadioAreaGroupProps) => {
  const childrenWithProps = React.Children.map(children, (child) => {
    if (onChange && React.isValidElement(child)) {
      return React.cloneElement(child, {
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          onChange(e.target.value);
        },
      });
    }
    return child;
  });
  return (
    <div className={className} {...passThroughProps}>
      {childrenWithProps}
    </div>
  );
};

RadioAreaGroup.displayName = "RadioAreaGroup";
RadioArea.displayName = "RadioArea";

const Item = RadioArea;
const Group = RadioAreaGroup;

export { RadioArea, RadioAreaGroup, Item, Group };
