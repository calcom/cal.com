"use client";

import { Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RRResetInterval } from "@calcom/prisma/enums";
import { Select } from "@calcom/ui/components/form";

const RoundRobinResetInterval = () => {
  const { t } = useLocale();

  const intervalOptions: {
    value: RRResetInterval;
    label: string;
  }[] = [
    {
      value: RRResetInterval.MONTH,
      label: t("monthly"),
    },
    {
      value: RRResetInterval.DAY,
      label: t("daily"),
    },
  ];

  return (
    <Controller
      name="rrResetInterval"
      render={({ field: { value, onChange } }) => {
        return (
          <>
            <div className="">
              <h4 className="text-emphasis text-sm font-semibold leading-5">
                {t("reset_interval_weighted_rr")}
              </h4>
              <p className="text-default text-sm">{t("rr_reset_interval_description")}</p>
              <div className="mt-4 w-48">
                <Select
                  options={intervalOptions}
                  value={intervalOptions.find((opt) => opt.value === value)}
                  onChange={(val) => {
                    onChange(val?.value);
                  }}
                />
              </div>
            </div>
          </>
        );
      }}
    />
  );
};

export default RoundRobinResetInterval;
