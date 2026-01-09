import type { FeatureId } from "@calcom/features/flags/config";

/**
 * Policy that determines how feature opt-in states are evaluated.
 *
 * - `permissive`: User opt-in can activate the feature; any explicit enable above is sufficient;
 *   disables only win if ALL teams disable.
 * - `strict`: User opt-in alone is not enough; requires explicit enable from org/team;
 *   ANY explicit disable blocks.
 */
export type OptInFeaturePolicy = "permissive" | "strict";

export interface OptInFeatureConfig {
  slug: FeatureId;
  titleI18nKey: string;
  descriptionI18nKey: string;
  /**
   * Policy that determines how feature opt-in states are evaluated.
   * Defaults to "permissive" if not specified.
   */
  policy?: OptInFeaturePolicy;
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
