/**
 * Data-Only App Manifest
 *
 * This file provides app metadata without any dynamic imports,
 * preventing static analysis from triggering app chunk compilation.
 * Use this for app listings, navigation, and metadata access.
 */
import type { AppCategories } from "@calcom/prisma/enums";

// Lightweight app metadata for listings
export interface AppManifestEntry {
  id: string;
  name: string;
  slug: string;
  category: AppCategories;
  logo: string;
  description: string;
  website: string;
  email: string;
  dirName: string;
  isTemplate?: boolean;
  key?: never; // Never expose API keys in manifest
}

/**
 * Get app manifest data without triggering imports
 * This uses hardcoded data from the app store registry but without dynamic imports
 */
export async function getAppManifest(): Promise<AppManifestEntry[]> {
  // Import the generated metadata (data-only, no components)
  const { appStoreMetadata } = await import("./appStoreMetaData");

  return Object.entries(appStoreMetadata).map(([dirName, app]) => ({
    id: app.slug,
    name: app.name,
    slug: app.slug,
    category: (app.categories?.[0] || "other") as AppCategories,
    logo: app.logo,
    description: app.description,
    website: app.url || "",
    email: app.email || "",
    dirName: dirName,
    isTemplate: app.isTemplate,
  }));
}

/**
 * Get app categories for filtering without component compilation
 */
export async function getAppCategories(): Promise<Array<{ name: AppCategories; count: number }>> {
  const manifest = await getAppManifest();

  const categoryCount = manifest.reduce((acc, app) => {
    const category = app.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<AppCategories, number>);

  return Object.entries(categoryCount)
    .map(([name, count]) => ({
      name: name as AppCategories,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get single app manifest entry
 */
export async function getAppManifestEntry(slug: string): Promise<AppManifestEntry | null> {
  const manifest = await getAppManifest();
  return manifest.find((app) => app.slug === slug) || null;
}

/**
 * Search apps by name or description
 */
export async function searchApps(query: string): Promise<AppManifestEntry[]> {
  const manifest = await getAppManifest();
  const lowercaseQuery = query.toLowerCase();

  return manifest.filter(
    (app) =>
      app.name.toLowerCase().includes(lowercaseQuery) ||
      app.description.toLowerCase().includes(lowercaseQuery) ||
      app.slug.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Get apps by category
 */
export async function getAppsByCategory(category: AppCategories): Promise<AppManifestEntry[]> {
  const manifest = await getAppManifest();
  return manifest.filter((app) => app.category === category);
}

/**
 * Get app statistics without loading components
 */
export async function getAppStats(): Promise<{
  totalApps: number;
  categoriesCount: number;
  templatesCount: number;
  publicAppsCount: number;
}> {
  const manifest = await getAppManifest();
  const categories = await getAppCategories();

  return {
    totalApps: manifest.length,
    categoriesCount: categories.length,
    templatesCount: manifest.filter((app) => app.isTemplate).length,
    publicAppsCount: manifest.filter((app) => !app.isTemplate).length,
  };
}

/**
 * Check if app exists in manifest
 */
export async function checkAppExists(slug: string): Promise<boolean> {
  const entry = await getAppManifestEntry(slug);
  return entry !== null;
}

/**
 * Get featured/trending apps (placeholder for future enhancement)
 */
export async function getFeaturedApps(limit = 6): Promise<AppManifestEntry[]> {
  const manifest = await getAppManifest();
  // For now, return first N apps, but this could be enhanced with actual featured logic
  return manifest.slice(0, limit);
}

/**
 * Get apps with error handling and fallback
 */
export async function getAppManifestSafe(): Promise<{
  apps: AppManifestEntry[];
  categories: Array<{ name: AppCategories; count: number }>;
  error?: string;
}> {
  try {
    const [apps, categories] = await Promise.all([getAppManifest(), getAppCategories()]);

    return { apps, categories };
  } catch (error) {
    console.error("Failed to load app manifest:", error);
    return {
      apps: [],
      categories: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
