"use client";

import { Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RRTimestampBasis } from "@calcom/prisma/enums";
import { Select } from "@calcom/ui/components/form";

const RoundRobinTimestampBasis = () => {
  const { t } = useLocale();

  const timestampBasisOptions: {
    value: RRTimestampBasis;
    label: string;
  }[] = [
    {
      value: RRTimestampBasis.CREATED_AT,
      label: "Booking Created At",
    },
    {
      value: RRTimestampBasis.START_TIME,
      label: "Booking Start Time",
    },
  ];
  return (
    <Controller
      name="rrTimestampBasis"
      render={({ field: { value, onChange } }) => {
        return (
          <>
            <h4 className="text-emphasis text-sm font-semibold leading-5">{t("timestamp_basis")}</h4>
            <p className="text-default text-sm leading-tight">{t("timestamp_basis_description")}</p>
            <div className="mt-4 w-48">
              <Select
                options={timestampBasisOptions}
                value={timestampBasisOptions.find((opt) => opt.value === value)}
                onChange={(val) => {
                  onChange(val?.value);
                }}
              />
              <p className="text-attention mt-2 text-sm">{t("load_balancing_warning")}</p>
            </div>
          </>
        );
      }}
    />
  );
};

export default RoundRobinTimestampBasis;
