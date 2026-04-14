"use client";

import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/i18n/useLocale";
import classNames from "@calcom/ui/classNames";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "@coss/ui/icons";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";
import { Toggle, ToggleGroup, ToggleGroupSeparator } from "@coss/ui/components/toggle-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import type { ReactElement } from "react";

import { getOptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import type { NormalizedFeature, UseFeatureOptInResult } from "@calcom/features/feature-opt-in/types";

interface FeaturesSettingsProps {
  /** The hook result - can be from useUserFeatureOptIn, useTeamFeatureOptIn, or useOrganizationFeatureOptIn */
  featureOptIn: UseFeatureOptInResult;
  /** Whether the user can edit the feature settings. If false, all toggles will be disabled. */
  canEdit?: boolean;
}

function handleValueChange(
  val: string | undefined,
  slug: string,
  setFeatureState: (slug: string, state: FeatureState) => void
): void {
  if (!val) return;
  setFeatureState(slug, val as FeatureState);
}

function LoadingSkeleton({
  autoOptInTitle,
  autoOptInDescription,
  featureTitle,
  featureDescription,
}: {
  autoOptInTitle: string;
  autoOptInDescription: string;
  featureTitle: string;
  featureDescription: string;
}): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <Card>
          <CardPanel>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardFrameHeader className="p-0">
                  <CardFrameTitle className="text-sm">{featureTitle}</CardFrameTitle>
                  <CardFrameDescription>{featureDescription}</CardFrameDescription>
                </CardFrameHeader>
                <Skeleton className="h-9 sm:h-8 w-40 rounded-lg" />
              </div>
            </div>
          </CardPanel>
        </Card>
      </CardFrame>
      <SettingsToggle title={autoOptInTitle} description={autoOptInDescription} loading />
    </div>
  );
}

function FeatureItem({
  feature,
  toggleLabels,
  getBlockedWarning,
  isBlockedByHigherLevel,
  autoOptIn,
  isTurningAutoOptInOff,
  setFeatureState,
  canEdit,
  t,
}: {
  feature: NormalizedFeature;
  toggleLabels: {
    disabled: string;
    enabled: string;
    inherit: string;
  };
  getBlockedWarning: (feature: NormalizedFeature) => string | null;
  isBlockedByHigherLevel: (feature: NormalizedFeature) => boolean;
  autoOptIn: boolean;
  isTurningAutoOptInOff: boolean;
  setFeatureState: (slug: string, state: FeatureState) => void;
  canEdit: boolean;
  t: (key: string) => string;
}): ReactElement | null {
  const config = getOptInFeatureConfig(feature.slug);

  const blockedWarning = getBlockedWarning(feature);
  const isInheritGlobalFeature = feature.currentState === "inherit" && feature.globalEnabled;
  const shouldShowEnabledIcon = isInheritGlobalFeature && (autoOptIn || (isTurningAutoOptInOff && !blockedWarning));
  const shouldShowBlockedWarning = Boolean(blockedWarning) && !shouldShowEnabledIcon;
  const blockedByHigherLevel = isBlockedByHigherLevel(feature);
  const isDisabled = blockedByHigherLevel || !canEdit;

  if (!config) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <CardFrameHeader className="p-0">
        <CardFrameTitle
          className={classNames(
            "flex items-center text-sm gap-1",
            shouldShowBlockedWarning && "text-muted-foreground line-through"
          )}>
          {t(config.i18n.name)}
          {shouldShowBlockedWarning && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span>
                    <CircleAlertIcon className="text-destructive-foreground size-4" />
                  </span>
                }
              />
              <TooltipPopup className="max-w-72 text-center">{blockedWarning}</TooltipPopup>
            </Tooltip>
          )}
          {shouldShowEnabledIcon && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span>
                    <CircleCheckIcon className="text-success-foreground size-4" />
                  </span>
                }
              />
              <TooltipPopup>{t("enabled_via_auto_opt_in")}</TooltipPopup>
            </Tooltip>
          )}
        </CardFrameTitle>
        <CardFrameDescription>{t(config.i18n.description)}</CardFrameDescription>
      </CardFrameHeader>
      <ToggleGroup
        onValueChange={(values) => handleValueChange(values[0], feature.slug, setFeatureState)}
        value={[feature.currentState]}
        variant="outline">
        <Toggle aria-label={toggleLabels.disabled} value="disabled" disabled={isDisabled}>
          {toggleLabels.disabled}
        </Toggle>
        <ToggleGroupSeparator />
        <Toggle aria-label={toggleLabels.enabled} value="enabled" disabled={isDisabled}>
          {toggleLabels.enabled}
        </Toggle>
        <ToggleGroupSeparator />
        <Toggle aria-label={toggleLabels.inherit} value="inherit" disabled={isDisabled}>
          {toggleLabels.inherit}
        </Toggle>
      </ToggleGroup>
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
  const isTurningAutoOptInOff = isAutoOptInMutationPending && !autoOptIn;

  if (isLoading) {
    return (
      <LoadingSkeleton
        autoOptInTitle={t("auto_opt_in_experimental")}
        autoOptInDescription={autoOptInDescription}
        featureTitle={t("bookings_v3_name")}
        featureDescription={t("bookings_v3_description")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {features.length === 0 && (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>{t("no_opt_in_features_available")}</AlertDescription>
        </Alert>
      )}
      {features.length > 0 && (
        <CardFrame>
          <Card>
            <CardPanel>
              <div className="flex flex-col gap-6">
                {features.map((feature) => (
                  <FeatureItem
                    key={feature.slug}
                    feature={feature}
                    toggleLabels={toggleLabels}
                    getBlockedWarning={getBlockedWarning}
                    isBlockedByHigherLevel={isBlockedByHigherLevel}
                    autoOptIn={autoOptIn}
                    isTurningAutoOptInOff={isTurningAutoOptInOff}
                    setFeatureState={setFeatureState}
                    canEdit={canEdit}
                    t={t}
                  />
                ))}
              </div>
            </CardPanel>
          </Card>
        </CardFrame>
      )}
      <SettingsToggle
        title={t("auto_opt_in_experimental")}
        description={autoOptInDescription}
        disabled={isAutoOptInMutationPending || !canEdit}
        checked={autoOptIn}
        onCheckedChange={setAutoOptIn}
      />
    </div>
  );
}

export default FeaturesSettings;
