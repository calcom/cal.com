"use client";

import type { EffectiveStateReason } from "@calcom/features/feature-opt-in/lib/computeEffectiveState";
import type { NormalizedFeature, UseFeatureOptInResult } from "@calcom/features/feature-opt-in/types";
import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import type { TFunction } from "i18next";
import { useCallback, useMemo } from "react";

type UserFeatureData = {
  featureId: string;
  globalEnabled: boolean;
  userState: FeatureState | undefined;
  effectiveReason: EffectiveStateReason;
};

function useMutationCallbacks(onSuccessCallback: () => void): { onSuccess: () => void; onError: () => void } {
  const { t } = useLocale();
  return useMemo(
    () => ({
      onSuccess: (): void => {
        onSuccessCallback();
        showToast(t("settings_updated_successfully"), "success");
      },
      onError: (): void => {
        showToast(t("error_updating_settings"), "error");
      },
    }),
    [onSuccessCallback, t]
  );
}

function normalizeUserFeatures(data: UserFeatureData[] | undefined): NormalizedFeature[] {
  return (data ?? []).map((feature) => ({
    slug: feature.featureId,
    globalEnabled: feature.globalEnabled,
    currentState: feature.userState ?? "inherit",
    effectiveReason: feature.effectiveReason,
  }));
}

const WARNING_REASONS: Set<string> = new Set([
  "feature_org_disabled",
  "feature_all_teams_disabled",
  "feature_any_team_disabled",
  "feature_no_explicit_enablement",
  "feature_user_only_not_allowed",
]);

function createUserBlockedWarningFn(t: TFunction): (feature: NormalizedFeature) => string | null {
  return (feature: NormalizedFeature): string | null => {
    if (!feature.effectiveReason || !WARNING_REASONS.has(feature.effectiveReason)) return null;
    return t(feature.effectiveReason);
  };
}

function isUserBlockedByHigherLevel(feature: NormalizedFeature): boolean {
  return (
    feature.effectiveReason === "feature_org_disabled" ||
    feature.effectiveReason === "feature_all_teams_disabled" ||
    feature.effectiveReason === "feature_any_team_disabled"
  );
}

/**
 * Hook for managing feature opt-in at the user (personal) level.
 */
export function useUserFeatureOptIn(): UseFeatureOptInResult {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const featuresQuery = trpc.viewer.featureOptIn.listForUser.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const autoOptInQuery = trpc.viewer.featureOptIn.getUserAutoOptIn.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const invalidateFeatures = useCallback(() => utils.viewer.featureOptIn.listForUser.invalidate(), [utils]);
  const invalidateFeaturesAndAutoOptIn = useCallback(() => {
    utils.viewer.featureOptIn.getUserAutoOptIn.invalidate();
    utils.viewer.featureOptIn.listForUser.invalidate();
  }, [utils]);

  const setStateMutationCallbacks = useMutationCallbacks(invalidateFeatures);
  const setAutoOptInMutationCallbacks = useMutationCallbacks(invalidateFeaturesAndAutoOptIn);

  const setStateMutation = trpc.viewer.featureOptIn.setUserState.useMutation(setStateMutationCallbacks);
  const setAutoOptInMutation = trpc.viewer.featureOptIn.setUserAutoOptIn.useMutation(
    setAutoOptInMutationCallbacks
  );

  const features = useMemo(() => normalizeUserFeatures(featuresQuery.data), [featuresQuery.data]);
  const setFeatureState = (slug: string, state: FeatureState): void =>
    setStateMutation.mutate({ slug, state });
  const setAutoOptIn = (checked: boolean): void => setAutoOptInMutation.mutate({ autoOptIn: checked });
  const getBlockedWarning = createUserBlockedWarningFn(t);

  return {
    features,
    autoOptIn: autoOptInQuery.data?.autoOptIn ?? false,
    isLoading: featuresQuery.isLoading || autoOptInQuery.isLoading,
    setFeatureState,
    setAutoOptIn,
    isStateMutationPending: setStateMutation.isPending,
    isAutoOptInMutationPending: setAutoOptInMutation.isPending,
    toggleLabels: { enabled: t("feature_on"), disabled: t("feature_off"), inherit: t("use_default") },
    autoOptInDescription: t("auto_opt_in_experimental_description_personal"),
    getBlockedWarning,
    isBlockedByHigherLevel: isUserBlockedByHigherLevel,
  };
}
