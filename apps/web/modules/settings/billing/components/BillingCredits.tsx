"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@coss/ui/components/field";
import { FieldGrid } from "@coss/ui/shared/field-grid";
import { FieldsetLegend } from "@coss/ui/components/fieldset";
import { Form } from "@coss/ui/components/form";
import { Group } from "@coss/ui/components/group";
import { InputGroup, InputGroupAddon, InputGroupText } from "@coss/ui/components/input-group";
import { NumberField, NumberFieldInput } from "@coss/ui/components/number-field";
import { Progress } from "@coss/ui/components/progress";
import { SelectButton } from "@coss/ui/components/select";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@coss/ui/components/tooltip";
import { InfoIcon, SearchIcon } from "@coss/ui/icons";
import { showToast } from "@calcom/ui/components/toast";

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
        `py-1.5 px-2.5 flex justify-between`,
        underline === "dashed"
          ? "border-b border-dashed"
          : underline === "solid" ? "border-b" : undefined,
        className
      )}>
      <span
        className={classNames("text-sm", isBold ? "font-semibold" : "font-medium text-muted-foreground")}>
        {label}
      </span>
      <span
        className={classNames(`text-sm`, isBold ? "font-semibold" : "font-medium text-muted-foreground")}>
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
    control,
    handleSubmit,
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
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>{t("credits")}</CardFrameTitle>
          <CardFrameDescription>{t("view_and_manage_credits")}</CardFrameDescription>
        </CardFrameHeader>
        <Card className="rounded-b-none!">
          <CardPanel>
            <FieldGrid>
              {totalCredits > 0 ? (
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div>
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
                  </div>
                  <Progress value={100 - teamCreditsPercentageUsed} />
                  {/*750 credits per tip*/}
                  <div className="flex flex-1 justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {orgSlug ? t("credits_per_tip_org") : t("credits_per_tip_teams")}
                    </p>
                    <Button onClick={() => setShowMemberInvitationModal(true)} size="sm" variant="outline">
                      {t("add_members_no_ellipsis")}
                    </Button>
                  </div>
                </div>
              ) : null}
              {/*Additional Credits*/}
              <div className="flex items-center gap-2">
                <FieldsetLegend className="inline text-sm" render={<div />}>
                  {t("current_balance")}{" "}
                  <Badge variant="secondary" size="lg">
                    {numberFormatter.format(creditsData.credits.additionalCredits)}
                  </Badge>{" "}
                </FieldsetLegend>
                <TooltipProvider delay={0}>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipPopup className="max-w-48 text-center">{t("view_additional_credits_expense_tip")}</TooltipPopup>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* Users who are part of a team cannot buy personal credits */}
              {teamId || !isUserInTeam ? (
                <Form onSubmit={handleSubmit(onSubmit)} className="contents">
                  <Controller
                    name="quantity"
                    control={control}
                    rules={{
                      required: t("error_required_field"),
                      min: {
                        value: 50,
                        message: t("minimum_of_credits_required"),
                      },
                    }}
                    render={({
                      field: { name, value, onBlur, onChange, ref },
                      fieldState: { invalid, error },
                    }) => (
                      <Field name={name} invalid={invalid} className="md:col-start-1">
                        <FieldLabel>{t("additional_credits")}</FieldLabel>
                        <Group aria-label={t("additional_credits")} className="w-full gap-2">
                          <InputGroup>
                            <NumberField
                              aria-label={t("credits")}
                              value={value}
                              onValueChange={(nextValue) => onChange(nextValue ?? 0)}>
                              <NumberFieldInput className="text-left" onBlur={onBlur} ref={ref} />
                            </NumberField>
                            <InputGroupAddon align="inline-end">
                              <InputGroupText>{t("credits")}</InputGroupText>
                            </InputGroupAddon>
                          </InputGroup>
                          <div>
                            <Button variant="outline" type="submit" data-testid="buy-credits">
                              {t("buy")}
                            </Button>
                          </div>
                        </Group>
                        <FieldDescription>
                          <LearnMoreLink
                            t={t}
                            i18nKey="credit_worth_description"
                            href="https://cal.com/help/billing-and-usage/messaging-credits"
                          />
                        </FieldDescription>
                        <FieldError match={!!error}>{error?.message ?? t("invalid_input")}</FieldError>
                      </Field>
                    )}
                  />
                </Form>
              ) : null}
              {/*Download Expense Log*/}
              <Field className="md:col-start-1">
                <FieldLabel>{t("download_expense_log")}</FieldLabel>
                <Group aria-label={t("download_expense_log")} className="w-full gap-2">
                  <Combobox
                    autoHighlight
                    items={monthOptions}
                    onValueChange={(item) => item && setSelectedMonth(item)}
                    value={selectedMonth}>
                    <ComboboxTrigger render={<SelectButton />} >
                      <ComboboxValue />
                    </ComboboxTrigger>
                    <ComboboxPopup aria-label={t("select")}>
                      <div className="border-b p-2">
                        <ComboboxInput
                          placeholder={t("search")}
                          showTrigger={false}
                          startAddon={<SearchIcon />}
                        />
                      </div>
                      <ComboboxEmpty>{t("no_results")}</ComboboxEmpty>
                      <ComboboxList>
                        {(item: MonthOption) => (
                          <ComboboxItem key={item.value} value={item}>
                            {item.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxPopup>
                  </Combobox>
                  <div>
                    <Button variant="outline" onClick={handleDownload} loading={isDownloading}>
                      {t("download")}
                    </Button>
                  </div>
                </Group>
              </Field>
            </FieldGrid>
          </CardPanel>
        </Card>
      </CardFrame>
      {teamId && (
        <MemberInvitationModalWithoutMembers
          teamId={teamId}
          showMemberInvitationModal={showMemberInvitationModal}
          hideInvitationModal={() => setShowMemberInvitationModal(false)}
        />
      )}
    </>
  );
}
