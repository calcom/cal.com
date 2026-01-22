"use client";

import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { SettingsToggle, ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Tooltip } from "@calcom/ui/components/tooltip";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { getOptInFeatureConfig } from "../config";
import type { NormalizedFeature, UseFeatureOptInResult } from "../types";

interface FeaturesSettingsProps {
  /** The hook result - can be from useUserFeatureOptIn, useTeamFeatureOptIn, or useOrganizationFeatureOptIn */
  featureOptIn: UseFeatureOptInResult;
  /** Whether the user can edit the feature settings. If false, all toggles will be disabled. */
  canEdit?: boolean;
}

interface ToggleOption {
  value: string;
  label: string;
}

function isEnabledViaAutoOptIn(feature: NormalizedFeature, autoOptIn: boolean): boolean {
  return feature.currentState === "inherit" && autoOptIn && feature.globalEnabled;
}

function handleValueChange(
  val: string | undefined,
  slug: string,
  setFeatureState: (slug: string, state: FeatureState) => void
): void {
  if (!val) return;
  setFeatureState(slug, val as FeatureState);
}

function LoadingSkeleton(): ReactElement {
  return (
    <div className="border-subtle rounded-b-lg border-x border-b px-4 py-8 sm:px-6">
      <div className="space-y-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }): ReactElement {
  return <Alert severity="neutral" title={message} />;
}

function FeatureItem({
  feature,
  toggleOptions,
  getBlockedWarning,
  isBlockedByHigherLevel,
  autoOptIn,
  setFeatureState,
  canEdit,
  t,
}: {
  feature: NormalizedFeature;
  toggleOptions: ToggleOption[];
  getBlockedWarning: (feature: NormalizedFeature) => string | null;
  isBlockedByHigherLevel: (feature: NormalizedFeature) => boolean;
  autoOptIn: boolean;
  setFeatureState: (slug: string, state: FeatureState) => void;
  canEdit: boolean;
  t: (key: string) => string;
}): ReactElement | null {
  const config = getOptInFeatureConfig(feature.slug);

  const blockedWarning = getBlockedWarning(feature);
  const enabledViaAutoOptInFlag = isEnabledViaAutoOptIn(feature, autoOptIn);
  const blockedByHigherLevel = isBlockedByHigherLevel(feature);
  const isDisabled = blockedByHigherLevel || !canEdit;

  const finalToggleOptions = useMemo(() => {
    if (!isDisabled) {
      return toggleOptions;
    }
    return toggleOptions.map((option) => ({
      ...option,
      disabled: true,
    }));
  }, [toggleOptions, isDisabled]);

  if (!config) return null;

  return (
    <div key={feature.slug}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            className={classNames(
              "text-emphasis flex items-center text-sm font-medium",
              blockedWarning && "text-subtle line-through"
            )}>
            {t(config.i18n.name)}
            {blockedWarning && (
              <Tooltip side="top" content={blockedWarning}>
                <span>
                  <Icon name="circle-alert" className="text-error ml-1 h-4 w-4" />
                </span>
              </Tooltip>
            )}
            {enabledViaAutoOptInFlag && (
              <Tooltip side="top" content={t("enabled_via_auto_opt_in")}>
                <span>
                  <Icon name="circle-check" className="text-success ml-1 h-4 w-4" />
                </span>
              </Tooltip>
            )}
          </h3>
          <p className="text-subtle text-sm">{t(config.i18n.description)}</p>
        </div>
        <ToggleGroup
          value={feature.currentState}
          onValueChange={(val: string | undefined): void =>
            handleValueChange(val, feature.slug, setFeatureState)
          }
          options={finalToggleOptions}
        />
      </div>
    </div>
  );
}

export function FeaturesSettings({ featureOptIn, canEdit = true }: FeaturesSettingsProps): ReactElement {
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
    isBlockedByHigherLevel,
  } = featureOptIn;

  if (isLoading) return <LoadingSkeleton />;

  const toggleOptions: ToggleOption[] = [
    { value: "disabled", label: toggleLabels.disabled },
    { value: "enabled", label: toggleLabels.enabled },
    { value: "inherit", label: toggleLabels.inherit },
  ];

  return (
    <>
      <div className="border-subtle rounded-b-lg border-x border-b px-4 py-8 sm:px-6">
        {features.length === 0 && <EmptyState message={t("no_opt_in_features_available")} />}
        {features.length > 0 && (
          <div className="space-y-6">
            {features.map((feature) => (
              <FeatureItem
                key={feature.slug}
                feature={feature}
                toggleOptions={toggleOptions}
                getBlockedWarning={getBlockedWarning}
                isBlockedByHigherLevel={isBlockedByHigherLevel}
                autoOptIn={autoOptIn}
                setFeatureState={setFeatureState}
                canEdit={canEdit}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("auto_opt_in_experimental")}
        description={autoOptInDescription}
        disabled={isAutoOptInMutationPending || !canEdit}
        checked={autoOptIn}
        onCheckedChange={setAutoOptIn}
        switchContainerClassName="mt-6"
      />
    </>
  );
}

export default FeaturesSettings;
