import type { FeatureId } from "@calcom/features/flags/config";
import type { OptInFeaturePolicy, OptInFeatureScope } from "./types";

export type OptInFeatureDisplayLocation = "settings" | "banner";

const DEFAULT_DISPLAY_LOCATIONS: OptInFeatureDisplayLocation[] = ["settings"];

export interface OptInFeatureConfig {
  slug: FeatureId;
  i18n: {
    title: string;
    name: string;
    description: string;
  };
  bannerImage: {
    src: string;
    width: number;
    height: number;
  };
  policy: OptInFeaturePolicy;
  /** Scopes where this feature can be configured. Defaults to all scopes if not specified. */
  scope?: OptInFeatureScope[];
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
  {
    slug: "bookings-v3",
    i18n: {
      title: "bookings_v3_title",
      name: "bookings_v3_name",
      description: "bookings_v3_description",
    },
    bannerImage: {
      src: "/opt_in_banner_bookings_v3.png",
      width: 548,
      height: 348,
    },
    policy: "permissive",
    displayLocations: ["settings"],
    scope: ["org", "team", "user"], // Optional: defaults to all scopes if not specified
  },
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
 * Check if a feature should be displayed at a specific location.
 * Defaults to 'settings' if displayLocations is not specified.
 */
export function shouldDisplayFeatureAt(
  feature: OptInFeatureConfig,
  location: OptInFeatureDisplayLocation
): boolean {
  return (feature.displayLocations ?? DEFAULT_DISPLAY_LOCATIONS).includes(location);
}

/**
 * Whether there are opt-in features available for the user scope in settings.
 * Only counts features that should be displayed in settings (displayLocations includes 'settings' or is omitted).
 */
export const HAS_USER_OPT_IN_FEATURES: boolean = getOptInFeaturesForScope("user", "settings").length > 0;

/**
 * Whether there are opt-in features available for the team scope in settings.
 * Only counts features that should be displayed in settings (displayLocations includes 'settings' or is omitted).
 */
export const HAS_TEAM_OPT_IN_FEATURES: boolean = getOptInFeaturesForScope("team", "settings").length > 0;

/**
 * Whether there are opt-in features available for the org scope in settings.
 * Only counts features that should be displayed in settings (displayLocations includes 'settings' or is omitted).
 */
export const HAS_ORG_OPT_IN_FEATURES: boolean = getOptInFeaturesForScope("org", "settings").length > 0;

/**
 * Get opt-in features that are available for a specific scope.
 * Features without a scope field are available for all scopes.
 * Optionally filter by display location (e.g., 'settings' or 'banner').
 */
export function getOptInFeaturesForScope(
  scope: OptInFeatureScope,
  displayLocation?: OptInFeatureDisplayLocation
): OptInFeatureConfig[] {
  return OPT_IN_FEATURES.filter((f) => {
    const scopeMatches = !f.scope || f.scope.includes(scope);
    if (!scopeMatches) return false;
    if (displayLocation) {
      return shouldDisplayFeatureAt(f, displayLocation);
    }
    return true;
  });
}

/**
 * Check if a feature is allowed for a specific scope.
 * Features without a scope field are allowed for all scopes.
 * Features not in the config are NOT allowed (must be explicitly configured).
 */
export function isFeatureAllowedForScope(slug: string, scope: OptInFeatureScope): boolean {
  const config = getOptInFeatureConfig(slug);
  if (!config) return false;
  return !config.scope || config.scope.includes(scope);
}
