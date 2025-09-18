"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { TextField, Label, InputError } from "@calcom/ui/components/form";
import { ProgressBar } from "@calcom/ui/components/progress-bar";
import { showToast } from "@calcom/ui/components/toast";

import { BillingCreditsSkeleton } from "./BillingCreditsSkeleton";

type MonthOption = {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
};

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
  const pathname = usePathname();
  const session = useSession();
  const orgBranding = useOrgBranding();
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
  const orgId = session.data?.user?.org?.id;

  const parsedTeamId = Number(params.id);
  const teamId: number | undefined = Number.isFinite(parsedTeamId)
    ? parsedTeamId
    : typeof orgId === "number"
    ? orgId
    : undefined;

  const tokens = (pathname ?? "").split("/").filter(Boolean);
  const settingsIndex = tokens.indexOf("settings");
  const isOrgScopedPath =
    settingsIndex >= 0 && ["organizations", "teams"].includes(tokens[settingsIndex + 1]);

  const shouldRender = IS_SMS_CREDITS_ENABLED && !(orgId && !isOrgScopedPath && !orgBranding?.slug);

  const { data: creditsData, isLoading } = trpc.viewer.credits.getAllCredits.useQuery(
    { teamId },
    { enabled: shouldRender }
  );

  if (!shouldRender) return null;

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

  if (isLoading && teamId) return <BillingCreditsSkeleton />;
  if (!creditsData) return null;

  const numberFormatter = new Intl.NumberFormat();

  const onSubmit = (data: { quantity: number }) => {
    buyCreditsMutation.mutate({ quantity: data.quantity, teamId });
  };

  const totalCredits = (creditsData.credits.totalCreditsForMonth ?? 0) ||
    (creditsData.credits.totalMonthlyCredits + creditsData.credits.additionalCredits);
  const totalUsed = (creditsData.credits.totalCreditsUsedThisMonth ?? 0) ||
    (totalCredits - (creditsData.credits.totalRemainingCreditsForMonth ?? 0));
  const totalRemaining = (creditsData.credits.totalRemainingCreditsForMonth ?? 0) ||
    (creditsData.credits.totalRemainingMonthlyCredits + creditsData.credits.additionalCredits);

  const teamCreditsPercentageUsed =
    totalCredits > 0
      ? (totalUsed / totalCredits) * 100
      : 0;

  return (
    <>
      <div className="bg-muted border-muted mt-5 rounded-xl p-1">
        <div className="flex flex-col gap-1 px-4 py-5">
          <h2 className="text-default text-base font-semibold leading-none">{t("credits")}</h2>
          <p className="text-subtle text-sm font-medium leading-tight">{t("view_and_manage_credits")}</p>
        </div>
        <div className="bg-default border-muted flex w-full rounded-[10px] px-5 py-4">
          <div className="w-full">
            {creditsData.credits.totalMonthlyCredits > 0 ? (
              <div className="mb-4">
                <div className="flex justify-between">
                  <p className="text-default text-sm font-semibold leading-none">{t("monthly_credits")}</p>
                  <span className="text-sm font-semibold leading-none">
                    {numberFormatter.format(creditsData.credits.totalMonthlyCredits)}
                  </span>
                </div>
                {creditsData.credits.additionalCredits > 0 && (
                  <div className="mb-1 mt-1 flex justify-between">
                    <p className="text-subtle text-sm font-medium leading-tight">{t("additional_credits")}</p>
                    <span className="text-muted text-sm font-medium leading-tight">
                      {numberFormatter.format(creditsData.credits.additionalCredits)}
                    </span>
                  </div>
                )}
                <div className="mb-1 mt-1 flex justify-between">
                  <p className="text-subtle text-sm font-medium leading-tight">{t("remaining")}</p>
                  <span className="text-muted text-sm font-medium leading-tight">
                    {numberFormatter.format(creditsData.credits.totalRemainingMonthlyCredits)}
                  </span>
                </div>

                <ProgressBar
                  color="green"
                  percentageValue={teamCreditsPercentageUsed}
                  label={`${Math.max(0, Math.round(teamCreditsPercentageUsed))}%`}
                />
              </div>
            ) : (
              <></>
            )}
            <Label>
              {creditsData.credits.totalMonthlyCredits ? t("additional_credits") : t("available_credits")}
            </Label>
            <div className="mt-2 text-sm">{creditsData.credits.additionalCredits}</div>
          </div>
        </div>
      </div>
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
            {totalCredits > 0 ? (
              <div className="mb-4">
                <div className="space-y-2 mb-4">
                  {creditsData.credits.totalMonthlyCredits > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">{t("monthly_credits")}</span>
                      <span className="text-sm font-medium">
                        {numberFormatter.format(creditsData.credits.totalMonthlyCredits)}
                      </span>
                    </div>
                  )}
                  {creditsData.credits.additionalCredits > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">{t("additional_credits")}</span>
                      <span className="text-sm font-medium">
                        {numberFormatter.format(creditsData.credits.additionalCredits)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span className="text-sm">{t("total")}</span>
                    <span className="text-sm">
                      {numberFormatter.format(totalCredits)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("remaining")}</span>
                    <span className="text-sm font-medium">
                      {numberFormatter.format(totalRemaining)}
                    </span>
                  </div>
                </div>
                <ProgressBar
                  color="green"
                  percentageValue={100 - teamCreditsPercentageUsed}
                  label=""
                />
              </div>
            ) : (
              <>
                <Label>{t("available_credits")}</Label>
                <div className="mt-2 text-sm">{creditsData.credits.additionalCredits}</div>
              </>
            )}
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
              <div className="mr-auto">
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
    </>
  );
}
