import type { PlanFeature } from "../components/PlanColumn";

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `$${cents % 100 === 0 ? dollars : dollars.toFixed(2)}`;
}

export function teamFeatures(t: (key: string) => string): PlanFeature[] {
  return [
    { text: t("upgrade_feature_round_robin") },
    { text: t("upgrade_feature_collective_events") },
    { text: t("routing_forms") },
    { text: t("upgrade_feature_workflows") },
    { text: t("upgrade_feature_insights") },
    { text: t("upgrade_feature_remove_branding") },
  ];
}

export function orgFeatures(t: (key: string) => string): PlanFeature[] {
  return [
    { text: t("upgrade_feature_everything_in_team") },
    { text: t("unlimited_teams") },
    { text: t("upgrade_feature_verified_domain") },
    { text: t("upgrade_feature_directory_sync") },
    { text: t("upgrade_feature_sso") },
    { text: t("upgrade_feature_admin_panel") },
  ];
}

export function enterpriseFeatures(t: (key: string) => string): PlanFeature[] {
  return [
    { text: t("upgrade_feature_everything_in_org") },
    { text: t("upgrade_feature_dedicated_support") },
    { text: t("upgrade_feature_custom_sla") },
    { text: t("upgrade_feature_custom_integrations") },
    { text: t("upgrade_feature_compliance") },
  ];
}
