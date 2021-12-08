import classNames from "classnames";
import React, { forwardRef, InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
};

const MinutesField = forwardRef<HTMLInputElement, Props>(({ label, ...rest }, ref) => {
  return (
    <div className="block sm:flex">
      {!!label && (
        <div className="mb-4 min-w-48 sm:mb-0">
          <label htmlFor={rest.id} className="flex items-center h-full text-sm font-medium text-neutral-700">
            {label}
          </label>
        </div>
      )}
      <div className="w-full">
        <div className="relative rounded-sm shadow-sm">
          <input
            {...rest}
            ref={ref}
            type="number"
            className={classNames(
              "block w-full pl-2 pr-12 border-gray-300 rounded-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
              rest.className
            )}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-gray-500 sm:text-sm" id="duration">
              mins
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

MinutesField.displayName = "MinutesField";

export default MinutesField;
