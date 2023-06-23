import React from "react";
import { useFormContext } from "react-hook-form";
import type { UsePinInputProps } from "react-pin-input-hook";
import { usePinInput } from "react-pin-input-hook";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Input } from "@calcom/ui";

interface TwoFactorProps extends UsePinInputProps {
  center?: boolean;
}

export default function TwoFactor({ center = true, ...rest }: TwoFactorProps) {
  const { t } = useLocale();
  const methods = useFormContext();

  const className = "h-12 w-12 !text-xl text-center";

  const { fields } = usePinInput({
    ...rest,
    onComplete: (value) => {
      methods.setValue("totpCode", String(value));
      if (rest.onComplete) {
        rest.onComplete(value);
      }
    },
  });

  return (
    <>
      <div className={center ? "mx-auto !mt-0 max-w-sm" : "!mt-0 max-w-sm"}>
        <Label className="mt-4">{t("2fa_code")}</Label>

        <p className="text-subtle mb-4 text-sm">{t("2fa_enabled_instructions")}</p>

        <input type="hidden" {...methods.register("totpCode")} />

        <div className="flex flex-row justify-between">
          {fields.map((fieldProps, index) => (
            <Input key={`2fa${index}`} className={className} {...fieldProps} />
          ))}
        </div>
      </div>
    </>
  );
}
