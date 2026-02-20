"use client";

import type { NormalizedFeature, UseFeatureOptInResult } from "@calcom/features/feature-opt-in/types";
import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { useCallback, useMemo } from "react";

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

function normalizeFeatures(
  data: Array<{ featureId: string; globalEnabled: boolean; teamState: FeatureState }> | undefined
): NormalizedFeature[] {
  return (data ?? []).map((feature) => ({
    slug: feature.featureId,
    globalEnabled: feature.globalEnabled,
    currentState: feature.teamState,
  }));
}

function getOrgBlockedWarning(): string | null {
  return null;
}

function isOrgBlockedByHigherLevel(): boolean {
  return false;
}

/**
 * Hook for managing feature opt-in at the organization level.
 */
export function useOrganizationFeatureOptIn(): UseFeatureOptInResult {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const featuresQuery = trpc.viewer.featureOptIn.listForOrganization.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const autoOptInQuery = trpc.viewer.featureOptIn.getOrganizationAutoOptIn.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const invalidateFeatures = useCallback(
    () => utils.viewer.featureOptIn.listForOrganization.invalidate(),
    [utils]
  );
  const invalidateFeaturesAndAutoOptIn = useCallback(() => {
    utils.viewer.featureOptIn.getOrganizationAutoOptIn.invalidate();
    utils.viewer.featureOptIn.listForOrganization.invalidate();
  }, [utils]);

  const setStateMutationCallbacks = useMutationCallbacks(invalidateFeatures);
  const setAutoOptInMutationCallbacks = useMutationCallbacks(invalidateFeaturesAndAutoOptIn);

  const setStateMutation =
    trpc.viewer.featureOptIn.setOrganizationState.useMutation(setStateMutationCallbacks);
  const setAutoOptInMutation = trpc.viewer.featureOptIn.setOrganizationAutoOptIn.useMutation(
    setAutoOptInMutationCallbacks
  );

  const features = normalizeFeatures(featuresQuery.data);
  const setFeatureState = (slug: string, state: FeatureState): void =>
    setStateMutation.mutate({ slug, state });
  const setAutoOptIn = (checked: boolean): void => setAutoOptInMutation.mutate({ autoOptIn: checked });

  return {
    features,
    autoOptIn: autoOptInQuery.data?.autoOptIn ?? false,
    isLoading: featuresQuery.isLoading || autoOptInQuery.isLoading,
    setFeatureState,
    setAutoOptIn,
    isStateMutationPending: setStateMutation.isPending,
    isAutoOptInMutationPending: setAutoOptInMutation.isPending,
    toggleLabels: { enabled: t("enable"), disabled: t("disable"), inherit: t("let_users_decide") },
    autoOptInDescription: t("auto_opt_in_experimental_description_org"),
    getBlockedWarning: getOrgBlockedWarning,
    isBlockedByHigherLevel: isOrgBlockedByHigherLevel,
  };
}
