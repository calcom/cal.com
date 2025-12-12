"use client";

import { useMemo } from "react";

import { OPT_IN_FEATURES } from "@calcom/features/feature-opt-in/config/feature-opt-in.config";
import type { FeatureState } from "@calcom/features/feature-opt-in/types";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { ToggleGroup } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const FeaturesView = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: backendFeatures, isLoading } = trpc.viewer.featureOptIn.listForUser.useQuery();

  const setFeatureEnabledMutation = trpc.viewer.featureOptIn.setUserFeatureEnabled.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.listForUser.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  // Build the feature list from OPT_IN_FEATURES config, then merge with backend data
  const userControlledFeatures = useMemo(() => {
    return OPT_IN_FEATURES.map((configFeature) => {
      const backendFeature = backendFeatures?.find((f) => f.slug === configFeature.slug);

      return {
        slug: configFeature.slug,
        titleI18nKey: configFeature.titleI18nKey,
        descriptionI18nKey: configFeature.descriptionI18nKey,
        learnMoreUrl: configFeature.learnMoreUrl,
        // Backend data (with defaults for loading state)
        globallyEnabled: backendFeature?.globallyEnabled ?? true,
        userState: backendFeature?.userState ?? ("inherit" as FeatureState),
        teamExplicitlyDisabled: backendFeature?.teamExplicitlyDisabled ?? false,
      };
    }).filter((f) => f.globallyEnabled);
  }, [backendFeatures]);

  const userFeatureOptions = [
    { value: "enabled", label: t("option_on") },
    { value: "disabled", label: t("option_off") },
    { value: "inherit", label: t("use_default") },
  ];

  return (
    <SettingsHeader title={t("features")} description={t("features_description")} borderInShellHeader={true}>
      <div className="border-subtle rounded-b-xl border-x border-b px-4 py-8 sm:px-6">
        {userControlledFeatures.length === 0 ? (
          <p className="text-subtle text-sm">{t("no_features_available")}</p>
        ) : (
          <div className="space-y-6">
            {userControlledFeatures.map((feature) => (
              <div key={feature.slug} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-default text-sm font-medium">{t(feature.titleI18nKey)}</span>
                    <span className="text-subtle text-sm">{t(feature.descriptionI18nKey)}</span>
                  </div>
                  <ToggleGroup
                    value={feature.userState}
                    options={userFeatureOptions}
                    disabled={isLoading}
                    onValueChange={(value) => {
                      if (value) {
                        setFeatureEnabledMutation.mutate({
                          featureSlug: feature.slug,
                          state: value as FeatureState,
                        });
                      }
                    }}
                  />
                </div>
                {feature.userState === "enabled" && feature.teamExplicitlyDisabled && (
                  <Alert severity="warning" title={t("feature_blocked_by_team_warning")} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsHeader>
  );
};

export default FeaturesView;
