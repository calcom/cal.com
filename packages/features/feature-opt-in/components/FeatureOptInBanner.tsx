"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { TopBanner } from "@calcom/ui/components/top-banner";

import type { EligibleOptInFeature } from "../services/FeatureManagementService";

const DISMISSED_BANNERS_KEY = "cal_feature_banners_dismissed";

function getDismissedBanners(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DISMISSED_BANNERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function dismissBanner(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const dismissed = getDismissedBanners();
    if (!dismissed.includes(slug)) {
      dismissed.push(slug);
      localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Ignore localStorage errors
  }
}

function isBannerDismissed(slug: string): boolean {
  return getDismissedBanners().includes(slug);
}

export interface FeatureOptInBannerProps {
  feature: EligibleOptInFeature;
  onDismiss?: () => void;
  onOptIn?: () => void;
}

export const FeatureOptInBanner = ({ feature, onDismiss, onOptIn }: FeatureOptInBannerProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const optInMutation = trpc.viewer.featureManagement.optInToFeature.useMutation({
    onSuccess: () => {
      utils.viewer.featureManagement.getEligibleOptInFeatures.invalidate();
      onOptIn?.();
    },
  });

  const handleOptIn = () => {
    optInMutation.mutate({ featureSlug: feature.slug });
  };

  const handleDismiss = () => {
    dismissBanner(feature.slug);
    onDismiss?.();
  };

  return (
    <TopBanner
      text={t(feature.titleI18nKey)}
      variant="default"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleOptIn}
            disabled={optInMutation.isPending}
            className="text-emphasis hover:bg-subtle rounded px-3 py-1 text-sm font-medium transition-colors">
            {t("try_it_now")}
          </button>
          {feature.learnMoreUrl && (
            <a
              href={feature.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-subtle hover:text-emphasis text-sm underline">
              {t("learn_more")}
            </a>
          )}
          <button
            onClick={handleDismiss}
            className="text-subtle hover:text-emphasis ml-2 text-sm">
            {t("dismiss")}
          </button>
        </div>
      }
    />
  );
};

export { getDismissedBanners, dismissBanner, isBannerDismissed, DISMISSED_BANNERS_KEY };
