import type { InputHTMLAttributes } from "react";
import React, { forwardRef } from "react";

import classNames from "@calcom/ui/classNames";
import { InfoBadge } from "@calcom/ui/components/badge";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  description: string;
  descriptionAsLabel?: boolean;
  informationIconText?: string;
};

const CheckboxField = forwardRef<HTMLInputElement, Props>(
  ({ label, description, informationIconText, ...rest }, ref) => {
    const descriptionAsLabel = !label || rest.descriptionAsLabel;
    return (
      <div className="block items-center sm:flex">
        {label && (
          <div className="min-w-48 mb-4 sm:mb-0">
            {React.createElement(
              descriptionAsLabel ? "div" : "label",
              {
                className: "flex text-sm font-medium text-default",
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
          <div className="relative flex items-start">
            {React.createElement(
              descriptionAsLabel ? "label" : "div",
              {
                className: classNames(
                  "relative flex items-start",
                  descriptionAsLabel ? "text-default" : "text-emphasis"
                ),
              },
              <>
                <div className="flex h-5 items-center">
                  <input
                    {...rest}
                    ref={ref}
                    type="checkbox"
                    className="text-emphasis focus:ring-emphasis dark:text-muted border-default bg-default checked:border-transparent! checked:bg-gray-800! h-4 w-4 rounded-[4px] transition"
                  />
                </div>
                <span className="ms-2 text-sm">{description}</span>
              </>
            )}
            {informationIconText && <InfoBadge content={informationIconText} />}
          </div>
        </div>
      </div>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
