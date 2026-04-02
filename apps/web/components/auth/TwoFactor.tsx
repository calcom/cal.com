import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Input, Label } from "@calcom/ui/components/form";
import React, { useEffect, useState } from "react";
import useDigitInput from "react-digit-input";
import { useFormContext } from "react-hook-form";

export default function TwoFactor({ center = true, autoFocus = true }) {
  const [value, onChange] = useState("");
  const { t } = useLocale();
  const methods = useFormContext();

  const digits = useDigitInput({
    acceptedCharacters: /^[0-9]$/,
    length: 6,
    value,
    onChange,
  });

  useEffect(() => {
    if (value) methods.setValue("totpCode", value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const className = "h-12 w-12 text-xl! text-center";

  return (
    <div className={center ? "mx-auto mt-0! max-w-sm" : "mt-0! max-w-sm"}>
      <Label className="mt-4">{t("2fa_code")}</Label>

      <p className="text-subtle mb-4 text-sm">{t("2fa_enabled_instructions")}</p>

      <input type="hidden" value={value} {...methods.register("totpCode")} />

      <div className="flex flex-row justify-between">
        {digits.map((digit, index) => (
          <Input
            key={`2fa${index}`}
            className={className}
            name={`2fa${index + 1}`}
            inputMode="decimal"
            {...digit}
            autoFocus={autoFocus && index === 0}
            autoComplete="one-time-code"
          />
        ))}
      </div>
    </div>
  );
}
