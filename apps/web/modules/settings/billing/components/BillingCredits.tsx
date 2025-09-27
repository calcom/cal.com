/* eslint-disable prettier/prettier */
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { MemberInvitationModalWithoutMembers } from "@calcom/features/ee/teams/components/MemberInvitationModal";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";
import { Select } from "@calcom/ui/components/form";
import { TextField, Label, InputError } from "@calcom/ui/components/form";
import { Checkbox } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ProgressBar } from "@calcom/ui/components/progress-bar";
// Fix Switch import
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { BillingCreditsSkeleton } from "./BillingCreditsSkeleton";

/* eslint-disable prettier/prettier */

/* eslint-disable prettier/prettier */

/* eslint-disable prettier/prettier */

/* eslint-disable prettier/prettier */

type MonthOption = {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
};

type CreditRowProps = {
  label: string;
  value: number;
  isBold?: boolean;
  underline?: "dashed" | "solid";
  className?: string;
};

const CreditRow = ({ label, value, isBold = false, underline, className = "" }: CreditRowProps) => {
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div
      className={classNames(
        `my-1 flex justify-between`,
        underline === "dashed"
          ? "border-subtle border-b border-dashed"
          : underline === "solid"
          ? "border-subtle border-b border-solid"
          : "mt-1",
        className
      )}>
      <span
        className={classNames("text-sm", isBold ? "font-semibold" : "text-subtle font-medium leading-tight")}>
        {label}
      </span>
      <span
        className={classNames(`text-sm`, isBold ? "font-semibold" : "text-subtle font-medium leading-tight")}>
        {numberFormatter.format(value)}
      </span>
    </div>
  );
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
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const utils = trpc.useUtils();

  const [showAutoRechargeModal, setShowAutoRechargeModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<{ quantity: number }>({ defaultValues: { quantity: 50 } });

  const params = useParamsWithFallback();
  const orgId = session.data?.user?.org?.id;
  const orgSlug = session.data?.user?.org?.slug;

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

  const onSubmit = (data: { quantity: number }) => {
    buyCreditsMutation.mutate({ quantity: data.quantity, teamId });
  };

  const totalCredits = creditsData.credits.totalMonthlyCredits ?? 0;
  const totalUsed = creditsData.credits.totalCreditsUsedThisMonth ?? 0;

  const teamCreditsPercentageUsed = totalCredits > 0 ? (totalUsed / totalCredits) * 100 : 0;
  const numberFormatter = new Intl.NumberFormat();

  const autoRechargeSettings = creditsData?.settings;

  return (
    <>
      <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
        <div className="flex flex-col gap-1 px-4 py-5">
          <h2 className="text-default text-base font-semibold leading-none">{t("credits")}</h2>
          <p className="text-subtle text-sm font-medium leading-tight">{t("view_and_manage_credits")}</p>
        </div>
        <div className="bg-default border-muted flex w-full rounded-[10px] border px-5 py-4">
          <div className="w-full">
            {totalCredits > 0 ? (
              <>
                <div className="mb-4">
                  <CreditRow
                    label={t("monthly_credits")}
                    value={totalCredits}
                    isBold={true}
                    underline="dashed"
                  />
                  <CreditRow label={t("credits_used")} value={totalUsed} underline="solid" />
                  <CreditRow
                    label={t("total_credits_remaining")}
                    value={creditsData.credits.totalRemainingMonthlyCredits}
                  />
                  <div className="mt-4">
                    <ProgressBar color="green" percentageValue={100 - teamCreditsPercentageUsed} />
                  </div>
                  {/*750 credits per tip*/}
                  <div className="mt-4 flex flex-1 items-center justify-between">
                    <p className="text-subtle text-sm font-medium leading-tight">
                      {orgSlug ? t("credits_per_tip_org") : t("credits_per_tip_teams")}
                    </p>
                    <Button onClick={() => setShowMemberInvitationModal(true)} size="sm" color="secondary">
                      {t("add_members_no_ellipsis")}
                    </Button>
                  </div>
                </div>
                <div className="-mx-5 mt-5">
                  <hr className="border-subtle" />
                </div>
              </>
            ) : (
              <></>
            )}

            {/*Auto Top-Up goes here when we have it*/}
            {/*<div className="-mx-5 mt-5">
              <hr className="border-subtle" />
            </div>*/}
            {/*Additional Credits*/}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex">
              <div className="-mb-1 mr-auto w-full">
                <div className="flex justify-between">
                  <Label>{t("additional_credits")}</Label>
                  <div className="mb-2 flex items-center gap-1">
                    <p className="text-sm font-semibold leading-none">
                      <span className="text-subtle font-medium">{t("current_balance")}</span>{" "}
                      {numberFormatter.format(creditsData.credits.additionalCredits)}
                    </p>
                    <Tooltip content={t("view_additional_credits_expense_tip")}>
                      <Icon name="info" className="text-emphasis h-3 w-3" />
                    </Tooltip>
                  </div>
                </div>
                <div className="flex w-full items-center gap-2">
                  <TextField
                    required
                    type="number"
                    {...register("quantity", {
                      required: t("error_required_field"),
                      min: { value: 50, message: t("minimum_of_credits_required") },
                      valueAsNumber: true,
                    })}
                    label=""
                    containerClassName="w-full -mt-1"
                    size="sm"
                    onChange={(e) => setValue("quantity", Number(e.target.value))}
                    min={50}
                    addOnSuffix={<>{t("credits")}</>}
                  />
                  <Button color="secondary" target="_blank" size="sm" type="submit" data-testid="buy-credits">
                    {t("buy")}
                  </Button>
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

          {/* Auto-recharge section */}
          <div className="-mx-6 mb-6 mt-6">
            <hr className="border-subtle mb-3 mt-3" />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Label>{t("auto_recharge")}</Label>
              <p className="text-subtle mt-1 text-sm">
                {autoRechargeSettings?.enabled
                  ? t("auto_recharge_enabled_description", {
                      threshold: autoRechargeSettings?.threshold,
                      amount: autoRechargeSettings?.amount,
                    })
                  : t("auto_recharge_disabled_description")}
              </p>
              {autoRechargeSettings?.lastAutoRechargeAt && (
                <p className="text-subtle mt-1 text-sm">
                  {t("last_auto_recharged_at", {
                    date: dayjs(autoRechargeSettings.lastAutoRechargeAt).format("MMM D, YYYY HH:mm"),
                  })}
                </p>
              )}
            </div>
            <Button
              color="secondary"
              onClick={() => setShowAutoRechargeModal(true)}
              data-testid="configure-auto-recharge">
              {autoRechargeSettings?.enabled ? t("edit") : t("setup")}
            </Button>
          </div>

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
            </form>
            <div className="-mx-5 mt-5">
              <hr className="border-subtle" />
            </div>
            {/*Download Expense Log*/}
            <div className="mt-4 flex">
              <div className="mr-auto w-full">
                <Label className="mb-4">{t("download_expense_log")}</Label>
                <div className="mr-2 mt-1">
                  <Select
                    size="sm"
                    className="w-full"
                    innerClassNames={{
                      control: "font-medium text-emphasis",
                    }}
                    options={monthOptions}
                    value={selectedMonth}
                    onChange={(option) => option && setSelectedMonth(option)}
                  />
                </div>
              </div>
              <div className="mt-auto">
                <Button onClick={handleDownload} loading={isDownloading} color="secondary" size="sm">
                  {t("download")}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/*Credit Worth Section*/}
        <div className="text-subtle px-5 py-4 text-sm font-medium leading-tight">
          <ServerTrans
            t={t}
            i18nKey="credit_worth_description"
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
        </div>
      </div>

      {/* Auto-recharge modal */}
      {showAutoRechargeModal && (
        <AutoRechargeModal
          defaultValues={autoRechargeSettings}
          onSubmit={handleAutoRechargeSubmit}
          onCancel={() => setShowAutoRechargeModal(false)}
          isLoading={updateAutoRechargeMutation.isLoading}
        />
      )}
    </div>
      {teamId && (
        <MemberInvitationModalWithoutMembers
          teamId={teamId}
          showMemberInvitationModal={showMemberInvitationModal}
          hideInvitationModal={() => setShowMemberInvitationModal(false)}
          onSettingsOpen={() => {
            return;
          }}
        />
      )}
    </>
  );
}

function AutoRechargeModal({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: {
  defaultValues?: {
    enabled: boolean;
    threshold: number;
    amount: number;
  };
  onSubmit: (data: { enabled: boolean; threshold: number; amount: number }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{
    enabled: boolean;
    threshold: number;
    amount: number;
  }>({
    defaultValues: {
      enabled: defaultValues?.enabled ?? false,
      threshold: defaultValues?.threshold ?? 50,
      amount: defaultValues?.amount ?? 100,
    },
  });

  const enabled = watch("enabled");

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader title={t("auto_recharge_settings")} />
        <p className="text-subtle mb-4">{t("auto_recharge_description")}</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="flex items-center">
              <Checkbox
                {...register("enabled")}
                defaultChecked={defaultValues?.enabled}
                id="auto-recharge-toggle"
              />
              <Label className="ml-2" htmlFor="auto-recharge-toggle">
                {t("enable_auto_recharge")}
              </Label>
            </div>

            {enabled && (
              <>
                <div>
                  <Label htmlFor="threshold">{t("recharge_threshold")}</Label>
                  <TextField
                    id="threshold"
                    type="number"
                    {...register("threshold", {
                      required: t("error_required_field"),
                      min: { value: 10, message: t("minimum_threshold") },
                      valueAsNumber: true,
                    })}
                    placeholder="50"
                  />
                  {errors.threshold && (
                    <InputError message={errors.threshold.message ?? t("invalid_input")} />
                  )}
                  <p className="text-subtle mt-1 text-sm">{t("threshold_description")}</p>
                </div>

                <div>
                  <Label htmlFor="amount">{t("recharge_amount")}</Label>
                  <TextField
                    id="amount"
                    type="number"
                    {...register("amount", {
                      required: t("error_required_field"),
                      min: { value: 50, message: t("minimum_amount") },
                      valueAsNumber: true,
                    })}
                    placeholder="100"
                  />
                  {errors.amount && <InputError message={errors.amount.message ?? t("invalid_input")} />}
                  <p className="text-subtle mt-1 text-sm">{t("amount_description")}</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" color="secondary" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={isLoading}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
