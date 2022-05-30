import React, { forwardRef, InputHTMLAttributes } from "react";

import InfoBadge from "@components/ui/InfoBadge";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  description: string;
  descriptionAsLabel?: boolean;
  informationIconText?: string;
};

const CheckboxField = forwardRef<HTMLInputElement, Props>(
  ({ label, description, informationIconText, descriptionAsLabel, ...rest }, ref) => {
    return (
      <div className="block items-center sm:flex">
        {label && (
          <div className="min-w-48 mb-4 sm:mb-0">
            {React.createElement(
              descriptionAsLabel ? "div" : "label",
              {
                htmlFor: rest.id,
                className: "flex text-sm font-medium text-neutral-700",
              },
              label
            )}
          </div>
        )}
        <div className="w-full">
          <div className="relative flex items-start">
            {React.createElement(
              descriptionAsLabel ? "label" : "div",
              {
                className: "relative flex items-start",
              },
              <>
                <div className="flex h-5 items-center">
                  <input
                    {...rest}
                    ref={ref}
                    type="checkbox"
                    className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                  />
                </div>
                <span className="text-sm text-neutral-700 ltr:ml-3 rtl:mr-3">{description}</span>
              </>
            )}
            {informationIconText && <InfoBadge content={informationIconText}></InfoBadge>}
          </div>
        </div>
      </div>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
