import * as RadioGroup from "@radix-ui/react-radio-group";
import classNames from "classnames";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

const ENTERPRISE_BOOKING_FEE = "$99"; // TODO: get this from a new API endpoint

const ChooseLicense = (
  props: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
  } & Omit<JSX.IntrinsicElements["form"], "onSubmit" | "onChange">
) => {
  const { value: initialValue = "FREE", onChange, onSubmit, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  const { t } = useLocale();

  return (
    <form
      {...rest}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}>
      <RadioGroup.Root
        defaultValue={initialValue}
        value={value}
        aria-label={t("choose_a_license")}
        className="grid grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1"
        onValueChange={(value) => {
          onChange(value);
          setValue(value);
        }}>
        <RadioGroup.Item value="FREE">
          <div
            className={classNames(
              "bg-default cursor-pointer space-y-2 rounded-md border p-4 hover:border-black",
              value === "FREE" && "ring-2 ring-black"
            )}>
            <h2 className="font-cal text-emphasis text-xl">{t("agplv3_license")}</h2>
            <p className="font-medium text-green-800">{t("free_license_fee")}</p>
            <p className="text-subtle">{t("forever_open_and_free")}</p>
            <ul className="text-subtle ml-4 list-disc text-left text-xs">
              <li>{t("required_to_keep_your_code_open_source")}</li>
              <li>{t("cannot_repackage_and_resell")}</li>
              <li>{t("no_enterprise_features")}</li>
            </ul>
          </div>
        </RadioGroup.Item>
        <RadioGroup.Item value="EE">
          <div
            className={classNames(
              "bg-default cursor-pointer space-y-2 rounded-md border p-4 hover:border-black",
              value === "EE" && "ring-2 ring-black"
            )}>
            <h2 className="font-cal text-emphasis text-xl">{t("ee_enterprise_license")}</h2>
            <p className="font-medium text-green-800">
              {t("enterprise_booking_fee", { enterprise_booking_fee: ENTERPRISE_BOOKING_FEE })}
            </p>
            <p className="text-subtle">{t("enterprise_license_includes")}</p>
            <ul className="text-subtle ml-4 list-disc text-left text-xs">
              <li>{t("no_need_to_keep_your_code_open_source")}</li>
              <li>{t("repackage_rebrand_resell")}</li>
              <li>{t("a_vast_suite_of_enterprise_features")}</li>
            </ul>
          </div>
        </RadioGroup.Item>
      </RadioGroup.Root>
    </form>
  );
};

export default ChooseLicense;
