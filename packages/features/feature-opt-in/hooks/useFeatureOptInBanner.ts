"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";

import { trpc } from "@calcom/trpc/react";

import { dismissBanner } from "../components/FeatureOptInBanner";
import { OPT_IN_FEATURES } from "../config/feature-opt-in.config";
import type { EligibleOptInFeature } from "../services/FeatureAccessService";

export interface UseFeatureOptInBannerResult {
  featureToShow: EligibleOptInFeature | null;
  isLoading: boolean;
  dismissCurrentFeature: () => void;
  onOptInSuccess: () => void;
}

/**
 * Hook to manage the feature opt-in banner.
 *
 * The banner is shown when:
 * 1. The current URL matches a feature's bannerConfig.urlPatterns
 * 2. The feature is in the opt-in allowlist
 * 3. The user hasn't already opted in
 * 4. The user hasn't dismissed the banner (stored in localStorage)
 * 5. The feature is globally enabled
 */
export function useFeatureOptInBanner(): UseFeatureOptInBannerResult {
  const pathname = usePathname();

  const [dismissedFeatures, setDismissedFeatures] = useState<string[]>([]);
  const [featureToShow, setFeatureToShow] = useState<EligibleOptInFeature | null>(null);

  // Find features that match the current URL pattern
  const matchingFeatureSlugs = useMemo(() => {
    if (!pathname) return [];

    return OPT_IN_FEATURES.filter((feature) => {
      if (!feature.bannerConfig?.urlPatterns) return false;
      return feature.bannerConfig.urlPatterns.some((pattern) => pathname.startsWith(pattern));
    }).map((feature) => feature.slug);
  }, [pathname]);

  const hasMatchingFeatures = matchingFeatureSlugs.length > 0;

  const { data: eligibleFeatures, isLoading } = trpc.viewer.featureOptIn.getEligibleOptInFeatures.useQuery(
    undefined,
    {
      enabled: hasMatchingFeatures,
    }
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cal_feature_banners_dismissed");
      setDismissedFeatures(stored ? JSON.parse(stored) : []);
    }
  }, []);

  useEffect(() => {
    if (!hasMatchingFeatures || !eligibleFeatures) {
      setFeatureToShow(null);
      return;
    }

    // Find the first matching feature that is eligible and not dismissed
    for (const slug of matchingFeatureSlugs) {
      if (dismissedFeatures.includes(slug)) {
        continue;
      }

      const feature = eligibleFeatures.find((f) => f.slug === slug);
      if (feature) {
        setFeatureToShow(feature);
        return;
      }
    }

    setFeatureToShow(null);
  }, [hasMatchingFeatures, matchingFeatureSlugs, eligibleFeatures, dismissedFeatures]);

  const dismissCurrentFeature = useCallback(() => {
    if (featureToShow) {
      dismissBanner(featureToShow.slug);
      setDismissedFeatures((prev) => [...prev, featureToShow.slug]);
      setFeatureToShow(null);
    }
  }, [featureToShow]);

  const onOptInSuccess = useCallback(() => {
    setFeatureToShow(null);
  }, []);

  return {
    featureToShow,
    isLoading,
    dismissCurrentFeature,
    onOptInSuccess,
  };
}
