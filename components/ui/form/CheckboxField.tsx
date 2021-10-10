import React, { forwardRef, InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description: string;
};

const CheckboxField = forwardRef<HTMLInputElement, Props>(({ label, description, ...rest }, ref) => {
  return (
    <div className="items-center block sm:flex">
      <div className="mb-4 min-w-48 sm:mb-0">
        <label htmlFor={rest.id} className="flex text-sm font-medium text-neutral-700">
          {label}
        </label>
      </div>
      <div className="w-full">
        <div className="relative flex items-start">
          <div className="flex items-center h-5">
            <input
              {...rest}
              ref={ref}
              type="checkbox"
              className="w-4 h-4 border-gray-300 rounded focus:ring-primary-500 text-primary-600"
            />
          </div>
          <div className="ml-3 text-sm">
            <p className="text-neutral-900">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
