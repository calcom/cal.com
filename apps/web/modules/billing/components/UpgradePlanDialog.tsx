"use client";

import { BILLING_PLANS, BILLING_PRICING } from "@calcom/features/ee/billing/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card } from "@coss/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { XIcon } from "@coss/ui/icons";
import posthog from "posthog-js";
import { useState } from "react";
import { enterpriseFeatures, formatCents, orgFeatures, teamFeatures } from "../lib/plan-data";
import type { BillingPeriod } from "./BillingPeriodToggle";
import { BillingPeriodToggle } from "./BillingPeriodToggle";
import { PlanColumn } from "./PlanColumn";

export type UpgradePlanDialogProps = {
  tracking: string;
  target: "team" | "organization";
  info?: {
    title: string;
    description: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  openLinksInNewTab?: boolean;
};

export function UpgradePlanDialog({
  tracking,
  target,
  info,
  open,
  onOpenChange,
  children,
  openLinksInNewTab,
}: UpgradePlanDialogProps): JSX.Element {
  const { t } = useLocale();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("annual");

  const { data: activeTeamPlan } = trpc.viewer.teams.hasActiveTeamPlan.useQuery();

  const teamPrice = formatCents(BILLING_PRICING[BILLING_PLANS.TEAMS][billingPeriod]);
  const orgPrice = formatCents(BILLING_PRICING[BILLING_PLANS.ORGANIZATIONS][billingPeriod]);

  const currentPlanPricingKey = activeTeamPlan?.billingPeriod === "ANNUALLY" ? "annual" : "monthly";
  const currentTeamPrice = formatCents(BILLING_PRICING[BILLING_PLANS.TEAMS][currentPlanPricingKey]);

  const bpParam = billingPeriod === "annual" ? "a" : "m";
  const teamHref = `/settings/teams/new?bp=${bpParam}`;
  const organizationHref = `/onboarding/organization/details?migrate=true&bp=${bpParam}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger render={children as React.ReactElement} />}
      <DialogPopup className="max-w-3xl" showCloseButton={false} bottomStickOnMobile={false}>
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle>{t("upgrade_dialog_title")}</DialogTitle>
            <div className="flex items-center gap-1 max-sm:order-last">
              <BillingPeriodToggle
                billingPeriod={billingPeriod}
                onBillingPeriodChange={setBillingPeriod}
                tracking={{ source: tracking, target }}
              />
              <DialogClose render={<Button size="icon" variant="ghost" />}>
                <XIcon />
              </DialogClose>
            </div>
            {info && (
              <Alert variant="info" className="w-full">
                <AlertTitle>{info.title}</AlertTitle>
                <AlertDescription>{info.description}</AlertDescription>
              </Alert>
            )}
          </div>
        </DialogHeader>

        <DialogPanel>
          <div className="mt-3 overflow-x-auto">
            <div className="flex gap-2 sm:gap-4 max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-fr max-sm:w-max">
              {target === "team" && (
                <PlanColumn
                  name={t("team")}
                  badge={t("upgrade_badge_free_trial")}
                  price={teamPrice}
                  priceSubtext={t("upgrade_price_per_month_user")}
                  description={t("upgrade_plan_team_tagline")}
                  features={teamFeatures(t)}
                  buttonText={t("upgrade_cta_teams")}
                  buttonHref={teamHref}
                  buttonTarget={openLinksInNewTab ? "_blank" : undefined}
                  primaryButton={target === "team"}
                  onCtaClick={() =>
                    posthog.capture("upgrade_plan_dialog_cta_clicked", {
                      source: tracking,
                      plan: "team",
                      target,
                      billingPeriod,
                    })
                  }
                />
              )}

              <PlanColumn
                name={t("organization")}
                badge={t("upgrade_badge_free_trial")}
                price={orgPrice}
                priceSubtext={t("upgrade_price_per_month_user")}
                description={t("upgrade_plan_org_tagline")}
                features={orgFeatures(t)}
                buttonText={t("upgrade_cta_orgs")}
                buttonHref={organizationHref}
                buttonTarget={openLinksInNewTab ? "_blank" : undefined}
                primaryButton={target === "organization"}
                onCtaClick={() =>
                  posthog.capture("upgrade_plan_dialog_cta_clicked", {
                    source: tracking,
                    plan: "organization",
                    target,
                    billingPeriod,
                  })
                }
              />

              <PlanColumn
                name={t("enterprise")}
                price={t("custom")}
                priceSubtext=""
                description={t("upgrade_plan_enterprise_tagline")}
                features={enterpriseFeatures(t)}
                buttonText={t("upgrade_cta_enterprise")}
                buttonHref="https://cal.com/sales"
                buttonTarget="_blank"
                onCtaClick={() =>
                  posthog.capture("upgrade_plan_dialog_cta_clicked", {
                    source: tracking,
                    plan: "enterprise",
                    target,
                    billingPeriod,
                  })
                }
              />
            </div>
          </div>

          <Card className="bg-muted mt-4 py-3 px-4 flex-row justify-between items-center">
            {target === "team" && (
              <div>
                <p className="font-medium text-sm text-emphasis">{t("individual")}</p>
                <p className="font-cal mt-1 font-semibold text-emphasis text-2xl leading-none">{t("free")}</p>
              </div>
            )}
            {target === "organization" && (
              <div>
                <p className="font-medium text-sm text-emphasis">{t("team")}</p>
                <p className="mt-1">
                  <span className="font-cal font-semibold text-emphasis text-2xl leading-none">
                    {currentTeamPrice}
                  </span>
                  <span className="ml-1 leading-none font-medium text-sm text-subtle">
                    {t("upgrade_price_per_month_user")}
                  </span>
                </p>
              </div>
            )}
            <Badge variant="outline" size="lg" className="rounded-lg py-1.5 px-2.5 h-fit!">
              <span className="text-emphasis opacity-50 leading-none">{t("upgrade_badge_current_plan")}</span>
            </Badge>
          </Card>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
