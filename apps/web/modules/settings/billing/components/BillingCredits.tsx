"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { TextField, Label, InputError } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ProgressBar } from "@calcom/ui/components/progress-bar";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { MemberInvitationModalWithoutMembers } from "~/ee/teams/components/MemberInvitationModal";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";

import { BillingCreditsSkeleton } from "./BillingCreditsSkeleton";

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
        className={classNames("text-sm", isBold ? "font-semibold" : "font-medium leading-tight text-subtle")}>
        {label}
      </span>
      <span
        className={classNames(`text-sm`, isBold ? "font-semibold" : "font-medium leading-tight text-subtle")}>
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

  const { data: teamPlanData } = trpc.viewer.teams.hasTeamPlan.useQuery(undefined, {
    enabled: shouldRender && !teamId,
  });
  const isUserInTeam = teamPlanData?.hasTeamPlan ?? false;

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

  // For personal billing page: hide credits section if user is part of a team and has no personal credits
  if (!teamId && isUserInTeam && creditsData.credits.additionalCredits <= 0) {
    return null;
  }

  const onSubmit = (data: { quantity: number }) => {
    buyCreditsMutation.mutate({ quantity: data.quantity, teamId });
  };

  const totalCredits = creditsData.credits.totalMonthlyCredits ?? 0;
  const totalUsed = creditsData.credits.totalCreditsUsedThisMonth ?? 0;

  const teamCreditsPercentageUsed = totalCredits > 0 ? (totalUsed / totalCredits) * 100 : 0;
  const numberFormatter = new Intl.NumberFormat();

  return (
    <>
      <div className="p-1 mt-5 rounded-xl border bg-cal-muted border-muted">
        <div className="flex flex-col gap-1 px-4 py-5">
          <h2 className="text-base font-semibold leading-none text-default">{t("credits")}</h2>
          <p className="text-sm font-medium leading-tight text-subtle">{t("view_and_manage_credits")}</p>
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
                  <div className="flex flex-1 justify-between items-center mt-4">
                    <p className="text-sm font-medium leading-tight text-subtle">
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
            <div className="flex mt-4">
              <div className="mr-auto -mb-1 w-full">
                <div className="flex justify-between">
                  <Label>{t("additional_credits")}</Label>
                  <div className="flex gap-1 items-center mb-2">
                    <p className="text-sm font-semibold leading-none">
                      <span className="font-medium text-subtle">{t("current_balance")}</span>{" "}
                      {numberFormatter.format(creditsData.credits.additionalCredits)}
                    </p>
                    <Tooltip content={t("view_additional_credits_expense_tip")}>
                      <Icon name="info" className="w-3 h-3 text-emphasis" />
                    </Tooltip>
                  </div>
                </div>
                {/* Users who are part of a team cannot buy personal credits */}
                {teamId || !isUserInTeam ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2 items-center w-full">
                    <TextField
                      required
                      type="number"
                      {...register("quantity", {
                        required: t("error_required_field"),
                        min: {
                          value: 50,
                          message: t("minimum_of_credits_required"),
                        },
                        valueAsNumber: true,
                      })}
                      label=""
                      containerClassName="w-full -mt-1"
                      size="sm"
                      onChange={(e) => setValue("quantity", Number(e.target.value))}
                      min={50}
                      addOnSuffix={<>{t("credits")}</>}
                    />
                    <Button
                      color="secondary"
                      target="_blank"
                      size="sm"
                      type="submit"
                      data-testid="buy-credits">
                      {t("buy")}
                    </Button>
                  </form>
                ) : null}
                {errors.quantity && <InputError message={errors.quantity.message ?? t("invalid_input")} />}
              </div>
            </div>
            <div className="-mx-5 mt-5">
              <hr className="border-subtle" />
            </div>
            {/*Download Expense Log*/}
            <div className="flex mt-4">
              <div className="mr-auto w-full">
                <Label className="mb-4">{t("download_expense_log")}</Label>
                <div className="mt-1 mr-2">
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
        <div className="px-5 py-4 text-sm font-medium leading-tight text-subtle">
          <LearnMoreLink
            t={t}
            i18nKey="credit_worth_description"
            href="https://cal.com/help/billing-and-usage/messaging-credits"
          />
        </div>
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
