"use client";

import { BILLING_PLANS, BILLING_PRICING } from "@calcom/features/ee/billing/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/components/icon";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Toggle, ToggleGroup } from "@coss/ui/components/toggle-group";
import Link from "next/link";
import posthog from "posthog-js";
import { useState } from "react";

type BillingPeriodToggle = "annual" | "monthly";

interface PlanFeature {
  text: string;
}

interface PlanColumnProps {
  name: string;
  badge?: string;
  price: string;
  priceSubtext: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  buttonHref: string;
  buttonTarget?: string;
  primaryButton?: boolean;
  onCtaClick?: () => void;
}

function PlanColumn({
  name,
  badge,
  price,
  priceSubtext,
  description,
  features,
  buttonText,
  buttonHref,
  buttonTarget,
  primaryButton,
  onCtaClick,
}: PlanColumnProps): JSX.Element {
  return (
    <Card className="flex-1 gap-0 rounded-xl border-subtle p-4 py-0">
      <CardPanel className="px-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-emphasis">{name}</h3>
          {badge && <Badge variant="outline" className="rounded-lg py-0.5 px-2 h-fit!">{badge}</Badge>}
        </div>
        <p className="font-cal mt-2 leading-none font-semibold text-2xl text-emphasis">{price}</p>
        <p className="mt-2 leading-none font-medium text-sm text-subtle h-4">{priceSubtext}</p>

        <Button
          className="mt-4 w-full"
          variant={primaryButton ? "default" : "outline"}
          onClick={onCtaClick}
          render={
            <Link
              href={buttonHref}
              target={buttonTarget}
              rel={buttonTarget === "_blank" ? "noopener noreferrer" : undefined}
            />
          }>
          <Icon name="circle-arrow-up" />
          <span>{buttonText}</span>
        </Button>

        <p className="mt-4 text-sm text-subtle">{description}</p>

        <ul className="mt-3 space-y-2">
          {features.map((feature) => (
            <li key={feature.text} className="flex items-start gap-2 text-sm">
              <Icon name="dot" className="relative top-0.5 h-4 w-4 shrink-0 text-default" />
              <span className="text-default">{feature.text}</span>
            </li>
          ))}
        </ul>
      </CardPanel>
    </Card>
  );
}

export type UpgradePlanDialogProps = {
  tracking: string;
  target: "team" | "organization";
  info?: {
    title: string;
    description: string;
  };
  children: React.ReactNode;
};

export function UpgradePlanDialog({ tracking, target, info, children }: UpgradePlanDialogProps): JSX.Element {
  const { t } = useLocale();
  const [billingPeriod, setBillingPeriod] = useState<"annual" | "monthly">("annual");

  const { data: activeTeamPlan } = trpc.viewer.teams.hasActiveTeamPlan.useQuery();

  const teamPrice = `$${BILLING_PRICING[BILLING_PLANS.TEAMS][billingPeriod]}`;
  const orgPrice = `$${BILLING_PRICING[BILLING_PLANS.ORGANIZATIONS][billingPeriod]}`;

  const currentPlanPricingKey = activeTeamPlan?.billingPeriod === "ANNUALLY" ? "annual" : "monthly";
  const currentTeamPrice = `$${BILLING_PRICING[BILLING_PLANS.TEAMS][currentPlanPricingKey]}`;

  const bpParam = billingPeriod === "annual" ? "a" : "m";
  const teamHref = `/settings/teams/new?bp=${bpParam}`;
  const organizationHref = `/onboarding/organization/details?migrate=true&bp=${bpParam}`;

  const teamFeatures: PlanFeature[] = [
    { text: t("upgrade_feature_round_robin") },
    { text: t("upgrade_feature_collective_events") },
    { text: t("routing_forms") },
    { text: t("upgrade_feature_workflows") },
    { text: t("upgrade_feature_insights") },
    { text: t("upgrade_feature_remove_branding") },
  ];

  const orgFeatures: PlanFeature[] = [
    { text: t("upgrade_feature_everything_in_team") },
    { text: t("unlimited_teams") },
    { text: t("upgrade_feature_verified_domain") },
    { text: t("upgrade_feature_directory_sync") },
    { text: t("upgrade_feature_sso") },
    { text: t("upgrade_feature_admin_panel") },
  ];

  const enterpriseFeatures: PlanFeature[] = [
    { text: t("upgrade_feature_everything_in_org") },
    { text: t("upgrade_feature_dedicated_support") },
    { text: t("upgrade_feature_custom_sla") },
    { text: t("upgrade_feature_custom_integrations") },
    { text: t("upgrade_feature_compliance") },
  ];

  return (
    <Dialog>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogPopup className="max-w-3xl" showCloseButton={false} bottomStickOnMobile={false}>
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center justify-between max-sm:w-full">
              <DialogTitle>{t("upgrade_dialog_title")}</DialogTitle>
              <DialogClose
                className="sm:hidden"
                render={<Button size="icon" variant="ghost" />}>
                <Icon name="x" />
              </DialogClose>
            </div>
            <ToggleGroup
              value={[billingPeriod]}
              onValueChange={(value): void => {
                if (value.length > 0) {
                  const newPeriod = value[0] as BillingPeriodToggle;
                  setBillingPeriod(newPeriod);
                  posthog.capture("upgrade_plan_dialog_billing_period_changed", {
                    source: tracking,
                    target,
                    billingPeriod: newPeriod,
                  });
                }
              }}
              className="rounded-lg bg-muted p-1"
              size="sm">
              <Toggle
                value="annual"
                className="gap-1 rounded-md data-pressed:bg-default data-pressed:shadow-sm">
                {t("upgrade_billing_annual")}
                <Badge variant="info" size="sm">
                  {t("discount_20")}
                </Badge>
              </Toggle>
              <Toggle
                value="monthly"
                className="ml-1 rounded-md data-pressed:bg-default data-pressed:shadow-sm">
                {t("monthly")}
              </Toggle>
            </ToggleGroup>
          </div>
          {info && (
            <Alert variant="info">
              <AlertTitle>{info.title}</AlertTitle>
              <AlertDescription>{info.description}</AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        <DialogPanel>
          <div className="mt-3 flex gap-2 sm:gap-4 overflow-x-auto [&>*]:min-w-[220px]">
            {target === "team" && (
              <PlanColumn
                name={t("team")}
                badge={t("upgrade_badge_free_trial")}
                price={teamPrice}
                priceSubtext={t("upgrade_price_per_month_user")}
                description={t("upgrade_plan_team_tagline")}
                features={teamFeatures}
                buttonText={t("upgrade_cta_teams")}
                buttonHref={teamHref}
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
              features={orgFeatures}
              buttonText={t("upgrade_cta_orgs")}
              buttonHref={organizationHref}
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
              features={enterpriseFeatures}
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
                <p className="font-cal mt-1 font-semibold text-emphasis text-2xl leading-none">
                  {currentTeamPrice}
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
