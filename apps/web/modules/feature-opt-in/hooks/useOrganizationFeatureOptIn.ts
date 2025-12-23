"use client";

import type { FeatureState } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type { NormalizedFeature, UseFeatureOptInResult } from "./types";

/**
 * Hook for managing feature opt-in at the organization level.
 */
export function useOrganizationFeatureOptIn(): UseFeatureOptInResult {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  // Queries
  const featuresQuery = trpc.viewer.featureOptIn.listForOrganization.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const autoOptInQuery = trpc.viewer.featureOptIn.getOrganizationAutoOptIn.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Mutations
  const setStateMutation = trpc.viewer.featureOptIn.setOrganizationState.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.listForOrganization.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const setAutoOptInMutation = trpc.viewer.featureOptIn.setOrganizationAutoOptIn.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.getOrganizationAutoOptIn.invalidate();
      utils.viewer.featureOptIn.listForOrganization.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  // Normalize features to common shape
  const features: NormalizedFeature[] = (featuresQuery.data ?? []).map((feature) => ({
    slug: feature.featureId,
    globalEnabled: feature.globalEnabled,
    currentState: feature.teamState,
  }));

  // Handlers
  const setFeatureState = (slug: string, state: FeatureState) => {
    setStateMutation.mutate({ slug, state });
  };

  const setAutoOptIn = (checked: boolean) => {
    setAutoOptInMutation.mutate({ autoOptIn: checked });
  };

  // Organization scope: no blocking warnings
  const getBlockedWarning = (): string | null => {
    return null;
  };

  return {
    features,
    autoOptIn: autoOptInQuery.data?.autoOptIn ?? false,
    isLoading: featuresQuery.isLoading || autoOptInQuery.isLoading,

    setFeatureState,
    setAutoOptIn,
    isStateMutationPending: setStateMutation.isPending,
    isAutoOptInMutationPending: setAutoOptInMutation.isPending,

    toggleLabels: {
      enabled: t("allow"),
      disabled: t("block"),
      inherit: t("let_users_decide"),
    },

    autoOptInDescription: t("auto_opt_in_experimental_description_org"),

    getBlockedWarning,
  };
}
