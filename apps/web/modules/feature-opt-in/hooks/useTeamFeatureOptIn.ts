"use client";

import type { NormalizedFeature, UseFeatureOptInResult } from "@calcom/features/feature-opt-in/types";
import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import type { TFunction } from "i18next";
import { useCallback, useMemo } from "react";

type FeatureBlockingState = { orgState?: FeatureState };
type TeamFeatureData = {
  featureId: string;
  globalEnabled: boolean;
  teamState: FeatureState;
  orgState: FeatureState;
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

function normalizeTeamFeatures(data: TeamFeatureData[] | undefined): NormalizedFeature[] {
  return (data ?? []).map((feature) => ({
    slug: feature.featureId,
    globalEnabled: feature.globalEnabled,
    currentState: feature.teamState,
  }));
}

function buildBlockingStateMap(data: TeamFeatureData[] | undefined): Map<string, FeatureBlockingState> {
  const map = new Map<string, FeatureBlockingState>();
  for (const feature of data ?? []) {
    map.set(feature.featureId, { orgState: feature.orgState });
  }
  return map;
}

function createTeamBlockedWarningFn(
  blockingStateMap: Map<string, FeatureBlockingState>,
  t: TFunction
): (feature: NormalizedFeature) => string | null {
  return (feature: NormalizedFeature): string | null => {
    const blockingState = blockingStateMap.get(feature.slug);
    if (blockingState?.orgState === "disabled") {
      return t("feature_org_disabled");
    }
    return null;
  };
}

function createTeamIsBlockedByHigherLevelFn(
  blockingStateMap: Map<string, FeatureBlockingState>
): (feature: NormalizedFeature) => boolean {
  return (feature: NormalizedFeature): boolean => {
    const blockingState = blockingStateMap.get(feature.slug);
    return blockingState?.orgState === "disabled";
  };
}

/**
 * Hook for managing feature opt-in at the team level.
 */
export function useTeamFeatureOptIn(teamId: number): UseFeatureOptInResult {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const featuresQuery = trpc.viewer.featureOptIn.listForTeam.useQuery(
    { teamId },
    { refetchOnWindowFocus: false }
  );
  const autoOptInQuery = trpc.viewer.featureOptIn.getTeamAutoOptIn.useQuery(
    { teamId },
    { refetchOnWindowFocus: false }
  );

  const invalidateFeatures = useCallback(
    () => utils.viewer.featureOptIn.listForTeam.invalidate({ teamId }),
    [utils, teamId]
  );
  const invalidateFeaturesAndAutoOptIn = useCallback(() => {
    utils.viewer.featureOptIn.getTeamAutoOptIn.invalidate({ teamId });
    utils.viewer.featureOptIn.listForTeam.invalidate({ teamId });
  }, [utils, teamId]);

  const setStateMutationCallbacks = useMutationCallbacks(invalidateFeatures);
  const setAutoOptInMutationCallbacks = useMutationCallbacks(invalidateFeaturesAndAutoOptIn);

  const setStateMutation = trpc.viewer.featureOptIn.setTeamState.useMutation(setStateMutationCallbacks);
  const setAutoOptInMutation = trpc.viewer.featureOptIn.setTeamAutoOptIn.useMutation(
    setAutoOptInMutationCallbacks
  );

  const featureBlockingState = useMemo(() => buildBlockingStateMap(featuresQuery.data), [featuresQuery.data]);
  const features = normalizeTeamFeatures(featuresQuery.data);
  const setFeatureState = (slug: string, state: FeatureState): void =>
    setStateMutation.mutate({ teamId, slug, state });
  const setAutoOptIn = (checked: boolean): void =>
    setAutoOptInMutation.mutate({ teamId, autoOptIn: checked });
  const getBlockedWarning = createTeamBlockedWarningFn(featureBlockingState, t);
  const isBlockedByHigherLevel = createTeamIsBlockedByHigherLevelFn(featureBlockingState);

  return {
    features,
    autoOptIn: autoOptInQuery.data?.autoOptIn ?? false,
    isLoading: featuresQuery.isLoading || autoOptInQuery.isLoading,
    setFeatureState,
    setAutoOptIn,
    isStateMutationPending: setStateMutation.isPending,
    isAutoOptInMutationPending: setAutoOptInMutation.isPending,
    toggleLabels: { enabled: t("enable"), disabled: t("disable"), inherit: t("let_users_decide") },
    autoOptInDescription: t("auto_opt_in_experimental_description_team"),
    getBlockedWarning,
    isBlockedByHigherLevel,
  };
}
