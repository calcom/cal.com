"use client";

import {
  BILLING_PLANS,
  BILLING_PRICING,
} from "@calcom/features/ee/billing/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";
import type { BillingPeriod } from "~/billing/components/BillingPeriodToggle";
import { BillingPeriodToggle } from "~/billing/components/BillingPeriodToggle";
import { formatCents } from "~/billing/lib/plan-data";

import { CurrentPlanSection } from "./CurrentPlanSection";
import type { PlanColumnProps } from "./PlanColumn";
import { PlanColumn } from "./PlanColumn";
import { SwitchPeriodConfirmDialog } from "./SwitchPeriodConfirmDialog";
import {
  enterprisePlanFeatures,
  orgPlanFeatures,
  teamPlanFeatures,
} from "./plan-features";

type PlanContext = "personal" | "team" | "organization";

interface PlansViewProps {
  context: PlanContext;
  teamId?: number;
  initialBillingPeriod?: "MONTHLY" | "ANNUALLY" | null;
  subscriptionEnd?: string | null;
}

type ButtonConfig = Pick<
  PlanColumnProps,
  | "buttonText"
  | "buttonVariant"
  | "buttonDisabled"
  | "buttonTooltip"
  | "buttonHref"
  | "buttonTarget"
  | "onButtonClick"
>;

export default function PlansView({
  context,
  teamId,
  initialBillingPeriod,
  subscriptionEnd,
}: PlansViewProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const returnTo = encodeURIComponent(pathname ?? "/settings/billing/plans");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("annual");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetPeriod: "MONTHLY" | "ANNUALLY";
    effectiveDate?: string;
  }>({ open: false, targetPeriod: "ANNUALLY" });

  const { data: activeTeamPlan } =
    trpc.viewer.teams.hasActiveTeamPlan.useQuery();
  const { data: billingInfo } =
    trpc.viewer.teams.getSubscriptionStatus.useQuery(
      { teamId: teamId! },
      { enabled: context !== "personal" && !!teamId }
    );

  const utils = trpc.useUtils();

  const switchBillingPeriod = trpc.viewer.teams.switchBillingPeriod.useMutation(
    {
      onSuccess: (data) => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        posthog.capture("plans_page_billing_period_switched", {
          context,
          teamId,
          newPeriod: data.newPeriod,
        });
        void utils.viewer.teams.hasActiveTeamPlan.invalidate();
        void utils.viewer.teams.getSubscriptionStatus.invalidate();
      },
    }
  );

  // Derived state
  const teamPrice = formatCents(
    BILLING_PRICING[BILLING_PLANS.TEAMS][billingPeriod]
  );
  const orgPrice = formatCents(
    BILLING_PRICING[BILLING_PLANS.ORGANIZATIONS][billingPeriod]
  );
  const billedText =
    billingPeriod === "annual" ? t("billed_annually") : t("billed_monthly");

  const currentBillingPeriod =
    context !== "personal"
      ? billingInfo?.billingPeriod ?? initialBillingPeriod
      : activeTeamPlan?.billingPeriod;
  const currentPlanPricingKey =
    currentBillingPeriod === "ANNUALLY" ? "annual" : "monthly";
  const currentTeamPrice = formatCents(
    BILLING_PRICING[BILLING_PLANS.TEAMS][currentPlanPricingKey]
  );
  const currentOrgPrice = formatCents(
    BILLING_PRICING[BILLING_PLANS.ORGANIZATIONS][currentPlanPricingKey]
  );

  const togglePeriodEnum = billingPeriod === "annual" ? "ANNUALLY" : "MONTHLY";
  const isOnCurrentPeriod = currentBillingPeriod === togglePeriodEnum;
  const bpParam = billingPeriod === "annual" ? "a" : "m";

  const canSwitchToMonthly = (() => {
    if (currentBillingPeriod !== "ANNUALLY" || !subscriptionEnd) return false;
    const msUntilEnd = new Date(subscriptionEnd).getTime() - Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return msUntilEnd <= thirtyDaysMs && msUntilEnd > 0;
  })();

  const renewalDateFormatted = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const currentPlanName =
    context === "organization"
      ? t("organization")
      : context === "team"
      ? t("team")
      : t("individual");
  const currentPlanPrice =
    context === "organization"
      ? currentOrgPrice
      : context === "team"
      ? currentTeamPrice
      : t("free");

  // Actions
  const handleSwitchPeriod = (targetPeriod: "MONTHLY" | "ANNUALLY") => {
    setConfirmDialog({ open: true, targetPeriod, effectiveDate: renewalDateFormatted ?? undefined });
  };

  const confirmSwitch = () => {
    if (!teamId) return;
    switchBillingPeriod.mutate({
      teamId,
      targetPeriod: confirmDialog.targetPeriod,
    });
  };

  // Button configs per column
  function getSwitchButtonOrCurrent(): ButtonConfig {
    if (isOnCurrentPeriod) {
      return {
        buttonText: t("current_plan"),
        buttonVariant: "outline",
        buttonDisabled: true,
      };
    }
    if (togglePeriodEnum === "MONTHLY" && !canSwitchToMonthly) {
      return {
        buttonText: t("switch_to_monthly"),
        buttonVariant: "outline",
        buttonDisabled: true,
        buttonTooltip: renewalDateFormatted
          ? t("switch_to_monthly_eligible_on", { date: renewalDateFormatted })
          : undefined,
      };
    }
    return {
      buttonText:
        billingPeriod === "annual"
          ? t("switch_to_annual")
          : t("switch_to_monthly"),
      buttonVariant: "outline",
      onButtonClick: () => handleSwitchPeriod(togglePeriodEnum),
    };
  }

  function getTeamColumnButton(): ButtonConfig {
    if (context === "team") return getSwitchButtonOrCurrent();
    if (context === "organization") {
      return {
        buttonText: t("team"),
        buttonVariant: "outline",
        buttonDisabled: true,
      };
    }
    return {
      buttonText: t("upgrade_cta_teams"),
      buttonVariant: "default",
      buttonHref: `/settings/teams/new?bp=${bpParam}&returnTo=${returnTo}`,
    };
  }

  function getOrgColumnButton(): ButtonConfig {
    if (context === "organization") return getSwitchButtonOrCurrent();
    return {
      buttonText: t("upgrade"),
      buttonVariant: context === "team" ? "default" : "outline",
      buttonHref: `/onboarding/organization/details?migrate=true&bp=${bpParam}&returnTo=${returnTo}`,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan */}
      <CurrentPlanSection
        context={context}
        planName={currentPlanName}
        planPrice={currentPlanPrice}
        billingPeriodBadge={
          currentBillingPeriod === "ANNUALLY"
            ? t("upgrade_billing_annual")
            : currentBillingPeriod === "MONTHLY"
            ? t("monthly")
            : null
        }
        renewalDateFormatted={renewalDateFormatted}
        teamId={teamId}
        t={t}
      />

      {/* Compare plans */}
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>{t("compare_plans")}</CardFrameTitle>
          <CardFrameDescription>{t("plans_description")}</CardFrameDescription>
          <CardFrameAction>
            <BillingPeriodToggle
              billingPeriod={billingPeriod}
              onBillingPeriodChange={setBillingPeriod}
            />
          </CardFrameAction>
        </CardFrameHeader>
        <Card>
          <CardPanel className="sm:py-0 sm:px-0 px-1">
            <div className="flex flex-col divide-y sm:grid sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
              <div className="p-5 sm:px-6 sm:py-6">
                <PlanColumn
                  name={t("team")}
                  price={teamPrice}
                  priceSubtext={`${t(
                    "upgrade_price_per_month_user"
                  )}, ${billedText}`}
                  description={t("upgrade_plan_team_tagline")}
                  features={teamPlanFeatures(t)}
                  {...getTeamColumnButton()}
                />
              </div>
              <div className="p-5 sm:px-6 sm:py-6">
                <PlanColumn
                  name={t("organization")}
                  price={orgPrice}
                  priceSubtext={`${t(
                    "upgrade_price_per_month_user"
                  )}, ${billedText}`}
                  description={t("upgrade_plan_org_tagline")}
                  features={orgPlanFeatures(t)}
                  {...getOrgColumnButton()}
                />
              </div>
              <div className="p-5 sm:px-6 sm:py-6">
                <PlanColumn
                  name={t("enterprise")}
                  price={t("custom")}
                  priceSubtext=""
                  description={t("upgrade_plan_enterprise_tagline")}
                  features={enterprisePlanFeatures(t)}
                  buttonText={t("upgrade_cta_enterprise")}
                  buttonVariant="outline"
                  buttonHref="https://cal.com/sales"
                  buttonTarget="_blank"
                />
              </div>
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <SwitchPeriodConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        targetPeriod={confirmDialog.targetPeriod}
        effectiveDate={confirmDialog.effectiveDate}
        isPending={switchBillingPeriod.isPending}
        isTrialing={billingInfo?.isTrialing}
        onConfirm={confirmSwitch}
      />
    </div>
  );
}
