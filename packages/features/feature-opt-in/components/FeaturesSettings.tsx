"use client";

import type { ReactElement } from "react";

import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { ToggleGroup } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { getOptInFeatureConfig } from "../config";
import type { NormalizedFeature, UseFeatureOptInResult } from "../types";

interface FeaturesSettingsProps {
  /** The hook result - can be from useUserFeatureOptIn, useTeamFeatureOptIn, or useOrganizationFeatureOptIn */
  featureOptIn: UseFeatureOptInResult;
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
  t,
}: {
  feature: NormalizedFeature;
  toggleOptions: ToggleOption[];
  getBlockedWarning: (feature: NormalizedFeature) => string | null;
  isBlockedByHigherLevel: (feature: NormalizedFeature) => boolean;
  autoOptIn: boolean;
  setFeatureState: (slug: string, state: FeatureState) => void;
  t: (key: string) => string;
}): ReactElement | null {
  const config = getOptInFeatureConfig(feature.slug);
  if (!config) return null;

  const blockedWarning = getBlockedWarning(feature);
  const isBlocked = isBlockedByHigherLevel(feature);
  const enabledViaAutoOptInFlag = isEnabledViaAutoOptIn(feature, autoOptIn);

  return (
    <div key={feature.slug}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            className={classNames(
              "text-emphasis flex items-center text-sm font-medium",
              blockedWarning && "text-subtle line-through"
            )}>
            {t(config.titleI18nKey)}
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
          <p className="text-subtle text-sm">{t(config.descriptionI18nKey)}</p>
        </div>
        <ToggleGroup
          value={feature.currentState}
          onValueChange={(val: string | undefined): void => handleValueChange(val, feature.slug, setFeatureState)}
          options={toggleOptions}
          disabled={isBlocked}
        />
      </div>
    </div>
  );
}

export function FeaturesSettings({ featureOptIn }: FeaturesSettingsProps): ReactElement {
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
    { value: "enabled", label: toggleLabels.enabled },
    { value: "disabled", label: toggleLabels.disabled },
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
        disabled={isAutoOptInMutationPending}
        checked={autoOptIn}
        onCheckedChange={setAutoOptIn}
        switchContainerClassName="mt-6"
      />
    </>
  );
}

export default FeaturesSettings;
