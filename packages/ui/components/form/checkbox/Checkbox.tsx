import type { InputHTMLAttributes } from "react";
import React, { forwardRef } from "react";

import classNames from "@calcom/lib/classNames";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  description: string;
  descriptionAsLabel?: boolean;
  informationIconText?: string;
  error?: boolean;
  className?: string;
  descriptionClassName?: string;
};

const CheckboxField = forwardRef<HTMLInputElement, Props>(
  ({ label, description, error, disabled, ...rest }, ref) => {
    const descriptionAsLabel = !label || rest.descriptionAsLabel;
    return (
      <div className="block items-center sm:flex">
        {label && (
          <div className="min-w-48 mb-4 sm:mb-0">
            {React.createElement(
              descriptionAsLabel ? "div" : "label",
              {
                className: classNames("flex text-sm font-medium text-emphasis"),
                ...(!descriptionAsLabel
                  ? {
                      htmlFor: rest.id,
                    }
                  : {}),
              },
              label
            )}
          </div>
        )}
        <div className="w-full">
          <div className="relative flex items-center">
            {React.createElement(
              descriptionAsLabel ? "label" : "div",
              {
                className: classNames(
                  "relative flex items-start",
                  !error && descriptionAsLabel ? "text-emphasis" : "text-emphasis",
                  error && "text-red-800"
                ),
              },
              <>
                <div className="flex h-5 items-end">
                  <input
                    {...rest}
                    ref={ref}
                    type="checkbox"
                    disabled={disabled}
                    className={classNames(
                      "text-primary-600 focus:ring-primary-500 border-default h-4 w-4 rounded ltr:mr-2 rtl:ml-2 ",
                      !error && disabled
                        ? "bg-gray-300 checked:bg-gray-300"
                        : "hover:bg-subtle checked:bg-gray-800",
                      error && "border-red-800 checked:bg-red-800 hover:bg-red-400",
                      rest.className
                    )}
                  />
                </div>
                <span className={classNames("text-sm", rest.descriptionClassName)}>{description}</span>
              </>
            )}
            {/* {informationIconText && <InfoBadge content={informationIconText}></InfoBadge>} */}
          </div>
        </div>
      </div>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
