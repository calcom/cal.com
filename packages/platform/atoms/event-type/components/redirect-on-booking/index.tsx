import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { SettingsToggle, TextField } from "@calcom/ui";

import type { FormValues } from "../../types";

type RedirectOnBookingProps = {
  formMethods: UseFormReturn<FormValues, any>;
  defaultValue?: string | number | readonly string[];
  successRedirectUrlLocked: {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
  isRedirectUrlVisible: boolean;
};

export function RedirectOnBooking({
  formMethods,
  successRedirectUrlLocked,
  isRedirectUrlVisible,
  defaultValue,
}: RedirectOnBookingProps) {
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(isRedirectUrlVisible);

  return (
    <Controller
      name="successRedirectUrl"
      control={formMethods.control}
      render={({ field: { value, onChange } }) => (
        <>
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              redirectUrlVisible && "rounded-b-none"
            )}
            childrenClassName="lg:ml-0"
            title="Redirect on booking "
            {...successRedirectUrlLocked}
            description="Redirect to a custom URL after a successful booking"
            checked={redirectUrlVisible}
            onCheckedChange={(e) => {
              setRedirectUrlVisible(e);
              onChange(e ? value : "");
            }}>
            <div className="border-subtle rounded-b-lg border border-t-0 p-6">
              <TextField
                className="w-full"
                label="Redirect on booking "
                labelSrOnly
                disabled={successRedirectUrlLocked.disabled}
                placeholder="https://example.com/redirect-to-my-success-page"
                required={redirectUrlVisible}
                type="text"
                defaultValue={defaultValue || ""}
                {...formMethods.register("successRedirectUrl")}
              />
              <div
                className={classNames(
                  "p-1 text-sm text-orange-600",
                  formMethods.getValues("successRedirectUrl") ? "block" : "hidden"
                )}>
                Adding a redirect will disable the success page. Make sure to mention \&quot;Booking
                Confirmed\&quot; on your custom success page.
              </div>
            </div>
          </SettingsToggle>
        </>
      )}
    />
  );
}
