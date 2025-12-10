"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { OPT_IN_FEATURES } from "@calcom/features/feature-opt-in/config/feature-opt-in.config";
import type { FeatureState } from "@calcom/features/feature-opt-in/types";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ToggleGroup } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface TeamFeaturesViewProps {
  canEdit: boolean;
}

const TeamFeaturesView = ({ canEdit }: TeamFeaturesViewProps) => {
  const { t } = useLocale();
  const params = useParams<{ id: string }>();
  const teamId = params?.id ? parseInt(params.id, 10) : null;
  const utils = trpc.useUtils();

  const { data: backendFeatures, isLoading } = trpc.viewer.featureOptIn.listForTeam.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId }
  );

  const setFeatureEnabledMutation = trpc.viewer.featureOptIn.setTeamFeatureEnabled.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.listForTeam.invalidate({ teamId: teamId! });
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  // Build the feature list from OPT_IN_FEATURES config, then merge with backend data
  const teamControlledFeatures = useMemo(() => {
    return OPT_IN_FEATURES.map((configFeature) => {
      const backendFeature = backendFeatures?.find((f) => f.slug === configFeature.slug);

      return {
        slug: configFeature.slug,
        titleI18nKey: configFeature.titleI18nKey,
        descriptionI18nKey: configFeature.descriptionI18nKey,
        learnMoreUrl: configFeature.learnMoreUrl,
        // Backend data (with defaults for loading state)
        globallyEnabled: backendFeature?.globallyEnabled ?? true,
        teamState: backendFeature?.teamState ?? ("inherit" as FeatureState),
      };
    }).filter((f) => f.globallyEnabled);
  }, [backendFeatures]);

  if (!teamId) {
    return null;
  }

  const teamFeatureOptions = [
    { value: "enabled", label: t("allow") },
    { value: "disabled", label: t("block") },
    { value: "inherit", label: t("let_users_decide") },
  ];

  return (
    <SettingsHeader
      title={t("features")}
      description={t("team_features_description")}
      borderInShellHeader={true}>
      <div className="border-subtle rounded-b-xl border-x border-b px-4 py-8 sm:px-6">
        {teamControlledFeatures.length === 0 ? (
          <p className="text-subtle text-sm">{t("no_features_available")}</p>
        ) : (
          <div className="space-y-6">
            {teamControlledFeatures.map((feature) => (
              <div key={feature.slug} className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-default text-sm font-medium">{t(feature.titleI18nKey)}</span>
                  <span className="text-subtle text-sm">{t(feature.descriptionI18nKey)}</span>
                </div>
                <ToggleGroup
                  value={feature.teamState}
                  options={teamFeatureOptions}
                  disabled={!canEdit || isLoading}
                  onValueChange={(value) => {
                    if (value) {
                      setFeatureEnabledMutation.mutate({
                        teamId: teamId,
                        featureSlug: feature.slug,
                        state: value as FeatureState,
                      });
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsHeader>
  );
};

export default TeamFeaturesView;
