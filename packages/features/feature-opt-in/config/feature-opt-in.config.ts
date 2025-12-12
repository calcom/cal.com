/**
 * Feature Management Configuration
 *
 * This file defines which features are available for opt-in via the banner system
 * and their associated metadata for display in the UI.
 */

export interface BannerConfig {
  messageI18nKey: string;
  urlPatterns: string[];
}

export interface OptInFeatureConfig {
  slug: string;
  titleI18nKey: string;
  descriptionI18nKey: string;
  learnMoreUrl?: string;
  bannerConfig?: BannerConfig;
}

/**
 * Allowlist of features that can be opted into via the banner system.
 * Only features in this list will show the opt-in banner when accessed via URL parameter.
 * The bannerConfig.urlPatterns array defines which URL paths should show the opt-in banner.
 */
export const OPT_IN_FEATURES: OptInFeatureConfig[] = [
  {
    slug: "bookings-v3",
    titleI18nKey: "feature_bookings_v3_title",
    descriptionI18nKey: "feature_bookings_v3_description",
    learnMoreUrl: "https://cal.com/docs/features/bookings-v3",
    bannerConfig: {
      messageI18nKey: "feature_bookings_v3_banner_message",
      urlPatterns: ["/bookings"],
    },
  },
];

/**
 * Get the configuration for a specific feature by slug.
 * Returns undefined if the feature is not in the allowlist.
 */
export function getOptInFeatureConfig(slug: string): OptInFeatureConfig | undefined {
  return OPT_IN_FEATURES.find((feature) => feature.slug === slug);
}

/**
 * Check if a feature is in the opt-in allowlist.
 */
export function isFeatureInOptInAllowlist(slug: string): boolean {
  return OPT_IN_FEATURES.some((feature) => feature.slug === slug);
}

/**
 * Get all feature slugs that are in the opt-in allowlist.
 */
export function getOptInFeatureSlugs(): string[] {
  return OPT_IN_FEATURES.map((feature) => feature.slug);
}
