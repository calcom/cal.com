"use client";

import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { ToggleGroup } from "@calcom/ui/components/form";

import { OPT_IN_FEATURES } from "../config/feature-opt-in.config";
import type { FeatureState } from "../types";

interface BackendFeature {
  slug: string;
  globallyEnabled: boolean;
  userState: FeatureState;
  teamState: FeatureState;
  teamExplicitlyDisabled: boolean;
}

type FeatureSettingsVariant = "user" | "team" | "organization";

interface FeaturesSettingsListProps {
  variant: FeatureSettingsVariant;
  backendFeatures: BackendFeature[] | undefined;
  isLoading: boolean;
  canEdit?: boolean;
  onFeatureStateChange: (featureSlug: string, state: FeatureState) => void;
}

const getToggleOptions = (variant: FeatureSettingsVariant, t: (key: string) => string) => {
  if (variant === "user") {
    return [
      { value: "enabled", label: t("on") },
      { value: "disabled", label: t("off") },
      { value: "inherit", label: t("use_default") },
    ];
  }
  // team and organization use the same options
  return [
    { value: "enabled", label: t("allow") },
    { value: "disabled", label: t("block") },
    { value: "inherit", label: t("let_users_decide") },
  ];
};

const FeaturesSettingsList = ({
  variant,
  backendFeatures,
  isLoading,
  canEdit = true,
  onFeatureStateChange,
}: FeaturesSettingsListProps) => {
  const { t } = useLocale();

  // Build the feature list from OPT_IN_FEATURES config, then merge with backend data
  const features = useMemo(() => {
    return OPT_IN_FEATURES.map((configFeature) => {
      const backendFeature = backendFeatures?.find((f) => f.slug === configFeature.slug);

      return {
        slug: configFeature.slug,
        titleI18nKey: configFeature.titleI18nKey,
        descriptionI18nKey: configFeature.descriptionI18nKey,
        learnMoreUrl: configFeature.learnMoreUrl,
        // Backend data (with defaults for loading state)
        globallyEnabled: backendFeature?.globallyEnabled ?? true,
        currentState:
          variant === "user"
            ? backendFeature?.userState ?? ("inherit" as FeatureState)
            : backendFeature?.teamState ?? ("inherit" as FeatureState),
        teamExplicitlyDisabled: backendFeature?.teamExplicitlyDisabled ?? false,
      };
    }).filter((f) => f.globallyEnabled);
  }, [backendFeatures, variant]);

  const toggleOptions = getToggleOptions(variant, t);
  const isDisabled = !canEdit || isLoading;

  if (features.length === 0) {
    return <p className="text-subtle text-sm">{t("no_features_available")}</p>;
  }

  return (
    <div className="space-y-6">
      {features.map((feature) => (
        <div key={feature.slug} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-default text-sm font-medium">{t(feature.titleI18nKey)}</span>
              <span className="text-subtle text-sm">{t(feature.descriptionI18nKey)}</span>
            </div>
            <ToggleGroup
              value={feature.currentState}
              options={toggleOptions}
              disabled={isDisabled}
              onValueChange={(value) => {
                if (value) {
                  onFeatureStateChange(feature.slug, value as FeatureState);
                }
              }}
            />
          </div>
          {variant === "user" && feature.currentState === "enabled" && feature.teamExplicitlyDisabled && (
            <Alert severity="warning" title={t("feature_blocked_by_team_warning")} />
          )}
        </div>
      ))}
    </div>
  );
};

export default FeaturesSettingsList;
