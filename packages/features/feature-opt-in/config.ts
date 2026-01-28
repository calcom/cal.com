import type { FeatureId } from "@calcom/features/flags/config";

export type OptInFeatureDisplayLocation = "settings" | "banner";

export interface OptInFeatureConfig {
  slug: FeatureId;
  titleI18nKey: string;
  descriptionI18nKey: string;
  /**
   * Where this feature should be displayed for opt-in.
   * - 'settings': Show in the Settings page
   * - 'banner': Show as a banner notification
   *
   * Defaults to ['settings'] if omitted.
   * Use ['settings', 'banner'] for both locations.
   * Use [] if you want the feature defined but not displayed anywhere.
   */
  displayLocations?: OptInFeatureDisplayLocation[];
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
 * Check if a feature slug is in the opt-in allowlist.
 * Acts as a type guard, narrowing the slug to FeatureId when true.
 */
export function isOptInFeature(slug: string): slug is FeatureId {
  return OPT_IN_FEATURES.some((f) => f.slug === slug);
}

/**
 * Get the display locations for a feature.
 * Returns ['settings'] as the default if displayLocations is not specified.
 */
export function getFeatureDisplayLocations(feature: OptInFeatureConfig): OptInFeatureDisplayLocation[] {
  return feature.displayLocations ?? ["settings"];
}

/**
 * Check if a feature should be displayed at a specific location.
 * Defaults to 'settings' if displayLocations is not specified.
 */
export function shouldDisplayFeatureAt(
  feature: OptInFeatureConfig,
  location: OptInFeatureDisplayLocation
): boolean {
  return getFeatureDisplayLocations(feature).includes(location);
}

/**
 * Get all opt-in features that should be displayed at a specific location.
 */
export function getOptInFeaturesForLocation(location: OptInFeatureDisplayLocation): OptInFeatureConfig[] {
  return OPT_IN_FEATURES.filter((feature) => shouldDisplayFeatureAt(feature, location));
}
