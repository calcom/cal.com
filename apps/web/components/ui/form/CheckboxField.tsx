import React, { forwardRef, InputHTMLAttributes } from "react";

import InfoBadge from "@components/ui/InfoBadge";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  description: string;
  descriptionAsLabel?: boolean;
  infomationIconText?: string;
};

const CheckboxField = forwardRef<HTMLInputElement, Props>(
  ({ label, description, infomationIconText, descriptionAsLabel, ...rest }, ref) => {
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
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
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
            {infomationIconText && <InfoBadge content={infomationIconText}></InfoBadge>}
          </div>
        </div>
      </div>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
