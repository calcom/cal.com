import type { PlanFeature } from "~/billing/types";

export type { PlanFeature };

export function teamPlanFeatures(t: (key: string) => string): PlanFeature[] {
  return [
    { text: t("settings_billing_plans_feature_one_team") },
    { text: t("settings_billing_plans_feature_schedule_as_team") },
    { text: t("settings_billing_plans_feature_round_robin") },
    { text: t("upgrade_feature_collective_events") },
    { text: t("routing_forms") },
    { text: t("upgrade_feature_workflows") },
    { text: t("upgrade_feature_remove_branding") },
    { text: t("settings_billing_plans_feature_same_day_support") },
  ];
}

export function orgPlanFeatures(t: (key: string) => string): PlanFeature[] {
  return [
    { text: t("unlimited_teams") },
    { text: t("settings_billing_plans_feature_org_workflows") },
    { text: t("settings_billing_plans_feature_subdomain") },
    { text: t("settings_billing_plans_feature_compliance") },
    { text: t("upgrade_feature_sso") },
    { text: t("settings_billing_plans_feature_instant_meetings") },
    { text: t("settings_billing_plans_feature_domain_wide_delegation") },
    { text: t("settings_billing_plans_feature_member_attributes") },
    { text: t("settings_billing_plans_feature_attribute_routing") },
  ];
}

export function enterprisePlanFeatures(t: (key: string) => string): PlanFeature[] {
  return [
    { text: t("settings_billing_plans_feature_dedicated_database") },
    { text: t("settings_billing_plans_feature_org_workflows") },
    { text: t("settings_billing_plans_feature_cal_ai_agents") },
    { text: t("settings_billing_plans_feature_active_directory_sync") },
    { text: t("settings_billing_plans_feature_dedicated_onboarding") },
    { text: t("settings_billing_plans_feature_enterprise_support") },
    { text: t("settings_billing_plans_feature_uptime_sla") },
    { text: t("settings_billing_plans_feature_slack_connect") },
  ];
}
