import type { FeatureId } from "@calcom/features/flags/config";
import type { OptInFeaturePolicy } from "./types";

export interface OptInFeatureConfig {
  slug: FeatureId;
  titleI18nKey: string;
  descriptionI18nKey: string;
  policy: OptInFeaturePolicy;
}

/**
 * Features that appear in opt-in settings.
 * Add new features here to make them available for user/team opt-in.
 */
export const OPT_IN_FEATURES: OptInFeatureConfig[] = [
  // Example - to be populated with actual features
  // {
  //   slug: "bookings-v3",
  //   titleI18nKey: "bookings_v3_title",
  //   descriptionI18nKey: "bookings_v3_description",
  //   policy: "permissive",
  // },
];

/**
 * Get the configuration for a specific opt-in feature by slug.
 */
export function getOptInFeatureConfig(slug: string): OptInFeatureConfig | undefined {
  return OPT_IN_FEATURES.find((f) => f.slug === slug);
}

/**
 * Check if a slug is in the opt-in allowlist.
 * Acts as a type guard, narrowing the slug to FeatureId when true.
 */
export function isOptInFeature(slug: string): slug is FeatureId {
  return OPT_IN_FEATURES.some((f) => f.slug === slug);
}

/**
 * Check if there are any opt-in features available.
 */
export const HAS_OPT_IN_FEATURES: boolean = OPT_IN_FEATURES.length > 0;
