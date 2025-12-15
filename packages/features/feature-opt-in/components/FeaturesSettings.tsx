"use client";

import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { ToggleGroup } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { getOptInFeatureConfig } from "../config";
import type { UseFeatureOptInResult } from "../hooks/types";

interface FeaturesSettingsProps {
  /** The hook result - can be from useUserFeatureOptIn, useTeamFeatureOptIn, or useOrganizationFeatureOptIn */
  featureOptIn: UseFeatureOptInResult;
}

/**
 * Shared component for displaying and managing feature opt-in settings.
 * Works with any scope (user, team, organization) by accepting the hook result as a prop.
 */
export function FeaturesSettings({ featureOptIn }: FeaturesSettingsProps) {
  const { t } = useLocale();

  const {
    features,
    autoOptIn,
    isLoading,
    setFeatureState,
    setAutoOptIn,
    isAutoOptInMutationPending,
    toggleLabels,
    autoOptInDescription,
    getBlockedWarning,
  } = featureOptIn;

  if (isLoading) {
    return (
      <div className="border-subtle rounded-b-lg border-x border-b px-4 py-8 sm:px-6">
        <div className="space-y-4">
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
        </div>
      </div>
    );
  }

  const toggleOptions = [
    { value: "enabled", label: toggleLabels.enabled },
    { value: "disabled", label: toggleLabels.disabled },
    { value: "inherit", label: toggleLabels.inherit },
  ];

  return (
    <>
      <div className="border-subtle rounded-b-lg border-x border-b px-4 py-8 sm:px-6">
        {features.length === 0 ? (
          <Alert severity="neutral" title={t("no_opt_in_features_available")} />
        ) : (
          <div className="space-y-6">
            {features.map((feature) => {
              const config = getOptInFeatureConfig(feature.slug);
              if (!config) {
                return null;
              }
              const blockedWarning = getBlockedWarning(feature);

              return (
                <div key={feature.slug}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-emphasis flex items-center text-sm font-medium">
                        {t(config.titleI18nKey)}
                        {blockedWarning && (
                          <Tooltip side="top" content={blockedWarning}>
                            <span title={blockedWarning}>
                              <Icon name="info" className="text-error ml-1 h-4 w-4" />
                            </span>
                          </Tooltip>
                        )}
                      </h3>
                      <p className="text-subtle text-sm">{t(config.descriptionI18nKey)}</p>
                    </div>
                    <ToggleGroup
                      value={feature.currentState}
                      onValueChange={(val) => setFeatureState(feature.slug, val as FeatureState)}
                      options={toggleOptions}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("auto_opt_in_experimental")}
        description={autoOptInDescription}
        disabled={isAutoOptInMutationPending}
        checked={autoOptIn}
        onCheckedChange={setAutoOptIn}
        switchContainerClassName="mt-6"
      />
    </>
  );
}

export default FeaturesSettings;
