"use client";

import { ProgressBar } from "@tremor/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { TextField, Label, InputError } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/toast";

import { BillingCreditsSkeleton } from "./BillingCreditsSkeleton";

type MonthOption = {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
};

// returns the last 12 months starting from May 2025 (when credits were introduced)
const getMonthOptions = (): MonthOption[] => {
  const options: MonthOption[] = [];
  const minDate = dayjs.utc("2025-05-01");

  let date = dayjs.utc();
  let count = 0;
  while ((date.isAfter(minDate) || date.isSame(minDate, "month")) && count < 12) {
    const startDate = date.startOf("month");
    const endDate = date.endOf("month");
    options.push({
      value: date.format("MMMM YYYY"),
      label: date.format("MMMM YYYY"),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    date = date.subtract(1, "month");
    count++;
  }

  return options;
};

export default function BillingCredits() {
  const { t } = useLocale();
  const router = useRouter();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>(monthOptions[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<{ quantity: number }>({ defaultValues: { quantity: 50 } });

  const params = useParamsWithFallback();
  const teamId = params.id ? Number(params.id) : undefined;

  const { data: creditsData, isLoading } = trpc.viewer.credits.getAllCredits.useQuery({ teamId });

  const buyCreditsMutation = trpc.viewer.credits.buyCredits.useMutation({
    onSuccess: (data) => {
      if (data.sessionUrl) {
        router.push(data.sessionUrl);
      }
    },
    onError: () => {
      showToast(t("credit_purchase_failed"), "error");
    },
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const result = await utils.viewer.credits.downloadExpenseLog.fetch({
        teamId,
        startDate: selectedMonth.startDate,
        endDate: selectedMonth.endDate,
      });
      if (result?.csvData) {
        const filename = `credit-expense-log-${selectedMonth.value.toLowerCase().replace(" ", "-")}.csv`;
        downloadAsCsv(result.csvData, filename);
      } else {
        showToast(t("error_downloading_expense_log"), "error");
      }
    } catch (error) {
      showToast(t("error_downloading_expense_log"), "error");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!IS_SMS_CREDITS_ENABLED) {
    return null;
  }

  if (isLoading && teamId) return <BillingCreditsSkeleton />;
  if (!creditsData) return null;

  const onSubmit = (data: { quantity: number }) => {
    buyCreditsMutation.mutate({ quantity: data.quantity, teamId });
  };

  const teamCreditsPercentageUsed =
    creditsData.credits.totalMonthlyCredits > 0
      ? (creditsData.credits.totalRemainingMonthlyCredits / creditsData.credits.totalMonthlyCredits) * 100
      : 0;

  return (
    <div className="border-subtle mt-8 space-y-6 rounded-lg border px-6 py-6 pb-6 text-sm sm:space-y-8">
      <div>
        <h2 className="text-base font-semibold">{t("credits")}</h2>
        <ServerTrans
          t={t}
          i18nKey="view_and_manage_credits_description"
          components={[
            <Link
              key="Credit System"
              className="underline underline-offset-2"
              target="_blank"
              href="https://cal.com/help/billing-and-usage/messaging-credits">
              Learn more
            </Link>,
          ]}
        />
        <div className="-mx-6 mt-6">
          <hr className="border-subtle" />
        </div>
        <div className="mt-6">
          {creditsData.credits.totalMonthlyCredits > 0 ? (
            <div className="mb-4">
              <Label>{t("monthly_credits")}</Label>
              <ProgressBar
                color="green"
                percentageValue={teamCreditsPercentageUsed}
                label={`${Math.max(0, Math.round(teamCreditsPercentageUsed))}%`}
              />
              <div className="text-subtle">
                <div>
                  {t("total_credits", {
                    totalCredits: creditsData.credits.totalMonthlyCredits,
                  })}
                </div>
                <div>
                  {t("remaining_credits", {
                    remainingCredits: creditsData.credits.totalRemainingMonthlyCredits,
                  })}
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}
          <Label>
            {creditsData.credits.totalMonthlyCredits ? t("additional_credits") : t("available_credits")}
          </Label>
          <div className="mt-2 text-sm">{creditsData.credits.additionalCredits}</div>
          <div className="-mx-6 mb-6 mt-6">
            <hr className="border-subtle mb-3 mt-3" />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex">
            <div className="-mb-1 mr-auto">
              <Label>{t("buy_additional_credits")}</Label>
              <div className="flex flex-col">
                <TextField
                  required
                  type="number"
                  {...register("quantity", {
                    required: t("error_required_field"),
                    min: { value: 50, message: t("minimum_of_credits_required") },
                    valueAsNumber: true,
                  })}
                  label=""
                  containerClassName="w-60"
                  onChange={(e) => setValue("quantity", Number(e.target.value))}
                  min={50}
                  addOnSuffix={<>{t("credits")}</>}
                />
                {errors.quantity && <InputError message={errors.quantity.message ?? t("invalid_input")} />}
              </div>
            </div>
            <div className="mt-auto">
              <Button
                color="primary"
                target="_blank"
                EndIcon="external-link"
                type="submit"
                data-testid="buy-credits">
                {t("buy_credits")}
              </Button>
            </div>
          </form>
          <div className="-mx-6 mb-6 mt-6">
            <hr className="border-subtle mb-3 mt-3" />
          </div>
          <div className="flex">
            <div className="mr-auto ">
              <Label className="mb-4">{t("download_expense_log")}</Label>
              <div className="mt-2 flex flex-col">
                <Select
                  options={monthOptions}
                  value={selectedMonth}
                  onChange={(option) => option && setSelectedMonth(option)}
                />
              </div>
            </div>
            <div className="mt-auto">
              <Button onClick={handleDownload} loading={isDownloading} StartIcon="file-down">
                {t("download")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
