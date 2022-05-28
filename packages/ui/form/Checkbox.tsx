import React, { forwardRef, InputHTMLAttributes } from "react";

import classNames from "@calcom/lib/classNames";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  description: string;
  descriptionAsLabel?: boolean;
  error?: boolean;
};

const CheckboxField = forwardRef<HTMLInputElement, Props>(
  ({ label, description, descriptionAsLabel, error, ...rest }, ref) => {
    return (
      <div className="block items-center sm:flex">
        {label && !descriptionAsLabel && (
          <div className="min-w-48 mb-4 sm:mb-0">
            <label htmlFor={rest.id} className="flex text-sm font-medium text-neutral-700">
              {label}
            </label>
          </div>
        )}
        {label && descriptionAsLabel && (
          <div className="min-w-48 mb-4 sm:mb-0">
            <span className="flex text-sm font-medium text-neutral-700">{label}</span>
          </div>
        )}
        <div className="w-full">
          <div className="relative flex items-start">
            <div className="flex h-5 items-center">
              <input
                {...rest}
                disabled={rest.disabled}
                ref={ref}
                type="checkbox"
                className={classNames(
                  " h-4 w-4 rounded focus:ring-1",
                  !error
                    ? "text-primary-600 focus:ring-primary-500 border-gray-300 hover:bg-gray-100 "
                    : "border-red-50 bg-red-800 text-red-800 focus:ring-red-800",
                  rest.disabled &&
                    "border-2 bg-white opacity-30 checked:bg-gray-900 checked:hover:bg-gray-900"
                )}
              />
            </div>
            <div className="text-sm ltr:ml-3 rtl:mr-3">
              {!label || descriptionAsLabel ? (
                <label htmlFor={rest.id} className="text-neutral-700">
                  {description}
                </label>
              ) : (
                <p className="text-neutral-900">{description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
