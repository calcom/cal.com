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
      label: t("booking_creation_time"),
    },
    {
      value: RRTimestampBasis.START_TIME,
      label: t("meeting_start_time"),
    },
  ];
  return (
    <Controller
      name="rrTimestampBasis"
      render={({ field: { value, onChange } }) => {
        return (
          <>
            <h4 className="text-emphasis text-sm font-semibold leading-5">
              {t("distribution_basis_weighted_rr")}
            </h4>
            <p className="text-default text-sm leading-tight">{t("timestamp_basis_description")}</p>
            <div className="mt-4 w-52">
              <Select
                options={timestampBasisOptions}
                value={timestampBasisOptions.find((opt) => opt.value === value)}
                onChange={(val) => {
                  onChange(val?.value);
                }}
              />
            </div>

            {value !== RRTimestampBasis.CREATED_AT && (
              <p className="text-attention mt-2 text-sm">{t("load_balancing_warning")}</p>
            )}
          </>
        );
      }}
    />
  );
};

export default RoundRobinTimestampBasis;
