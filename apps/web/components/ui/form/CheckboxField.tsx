import React, { forwardRef, InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  description: string;
};

const CheckboxField = forwardRef<HTMLInputElement, Props>(({ label, description, ...rest }, ref) => {
  return (
    <div className="block items-center sm:flex">
      <div className="min-w-48 mb-4 sm:mb-0">
        <label htmlFor={rest.id} className="flex text-sm font-medium text-neutral-700">
          {label}
        </label>
      </div>
      <div className="w-full">
        <div className="relative flex items-start">
          <div className="flex h-5 items-center">
            <input
              {...rest}
              ref={ref}
              type="checkbox"
              className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
            />
          </div>
          <div className="text-sm ltr:ml-3 rtl:mr-3">
            <p className="text-neutral-900">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
