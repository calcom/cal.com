"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import React from "react";
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

  const {
    register: registerAutoTopUp,
    handleSubmit: handleSubmitAutoTopUp,
    watch: watchAutoTopUp,
    formState: { errors: autoTopUpErrors },
    reset: resetAutoTopUp,
  } = useForm<{
    autoTopUpEnabled: boolean;
    autoTopUpThreshold: number;
    autoTopUpAmount: number;
  }>();

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

  const updateAutoTopUpMutation = trpc.viewer.credits.updateAutoTopUpSettings.useMutation({
    onSuccess: () => {
      showToast(t("auto_top_up_settings_saved"), "success");
      utils.viewer.credits.getAllCredits.invalidate();
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
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

  React.useEffect(() => {
    if (creditsData) {
      resetAutoTopUp({
        autoTopUpEnabled: creditsData.autoTopUpEnabled || false,
        autoTopUpThreshold: creditsData.autoTopUpThreshold || 100,
        autoTopUpAmount: creditsData.autoTopUpAmount || 500,
      });
    }
  }, [creditsData, resetAutoTopUp]);

  if (!shouldRender) return null;
  if (isLoading && teamId) return <BillingCreditsSkeleton />;
  if (!creditsData) return null;

  const onSubmit = (data: { quantity: number }) => {
    buyCreditsMutation.mutate({ quantity: data.quantity, teamId });
  };

  const onSubmitAutoTopUp = (data: {
    autoTopUpEnabled: boolean;
    autoTopUpThreshold: number;
    autoTopUpAmount: number;
  }) => {
    updateAutoTopUpMutation.mutate({
      teamId,
      ...data,
    });
  };

  const autoTopUpEnabled = watchAutoTopUp("autoTopUpEnabled");

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

          <div className="-mx-6 mb-6 mt-6">
            <hr className="border-subtle mb-3 mt-3" />
          </div>

          <form onSubmit={handleSubmitAutoTopUp(onSubmitAutoTopUp)}>
            <div className="mb-4">
              <Label className="mb-4">{t("auto_top_up")}</Label>
              <p className="text-subtle mb-4 text-sm">{t("auto_top_up_description")}</p>

              <div className="mb-4 flex items-center">
                <input type="checkbox" {...registerAutoTopUp("autoTopUpEnabled")} className="mr-2" />
                <Label>{t("enable_auto_top_up")}</Label>
              </div>

              {autoTopUpEnabled && (
                <div className="ml-6 space-y-4">
                  <div>
                    <Label>{t("auto_top_up_threshold")}</Label>
                    <TextField
                      type="number"
                      {...registerAutoTopUp("autoTopUpThreshold", {
                        required: t("error_required_field"),
                        min: { value: 1, message: t("minimum_threshold_required") },
                        valueAsNumber: true,
                      })}
                      label=""
                      containerClassName="w-60"
                      min={1}
                      addOnSuffix={<>{t("credits")}</>}
                    />
                    <p className="text-subtle mt-1 text-xs">{t("auto_top_up_threshold_help")}</p>
                    {autoTopUpErrors.autoTopUpThreshold && (
                      <InputError
                        message={autoTopUpErrors.autoTopUpThreshold.message ?? t("invalid_input")}
                      />
                    )}
                  </div>

                  <div>
                    <Label>{t("auto_top_up_amount")}</Label>
                    <TextField
                      type="number"
                      {...registerAutoTopUp("autoTopUpAmount", {
                        required: t("error_required_field"),
                        min: { value: 50, message: t("minimum_of_credits_required") },
                        valueAsNumber: true,
                      })}
                      label=""
                      containerClassName="w-60"
                      min={50}
                      addOnSuffix={<>{t("credits")}</>}
                    />
                    <p className="text-subtle mt-1 text-xs">{t("auto_top_up_amount_help")}</p>
                    {autoTopUpErrors.autoTopUpAmount && (
                      <InputError message={autoTopUpErrors.autoTopUpAmount.message ?? t("invalid_input")} />
                    )}
                  </div>
                </div>
              )}

              <Button type="submit" loading={updateAutoTopUpMutation.isPending} className="mt-4">
                {t("save")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
