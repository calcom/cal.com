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
 * This is safe to use anywhere in the application
 */
export async function getAppManifest(): Promise<AppManifestEntry[]> {
  try {
    // Import only the metadata, not the components
    const { appStoreMetadata } = await import("./appStoreMetaData");

    const manifest: AppManifestEntry[] = [];

    for (const [dirName, meta] of Object.entries(appStoreMetadata)) {
      // Extract only safe, UI-relevant data
      const { key: _key, ..._safeMetadata } = meta; // Remove API keys

      manifest.push({
        id: meta.slug,
        name: meta.name,
        slug: meta.slug,
        category: meta.category || "other",
        logo: meta.logo,
        description: meta.description,
        website: meta.publisher || "",
        email: meta.email || "",
        dirName,
        isTemplate: meta.isTemplate,
      } as AppManifestEntry);
    }
    return manifest;
  } catch (error) {
    console.error("Failed to load app manifest:", error);
    return [];
  }
}

/**
 * Get manifest entry for a specific app
 */
export async function getAppManifestEntry(appId: string): Promise<AppManifestEntry | null> {
  const manifest = await getAppManifest();
  return manifest.find((app) => app.slug === appId || app.dirName === appId) || null;
}

/**
 * Get manifest entries by category for filtered listings
 */
export async function getAppManifestByCategory(category: AppCategories): Promise<AppManifestEntry[]> {
  const manifest = await getAppManifest();
  return manifest.filter((app) => app.category === category);
}

/**
 * Get app categories with counts for category navigation
 */
export async function getAppCategories(): Promise<Array<{ name: AppCategories; count: number }>> {
  const manifest = await getAppManifest();

  const categoryCounts = manifest.reduce((acc, app) => {
    acc[app.category] = (acc[app.category] || 0) + 1;
    return acc;
  }, {} as Record<AppCategories, number>);

  return Object.entries(categoryCounts)
    .map(([name, count]) => ({ name: name as AppCategories, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Search apps by name or description without loading components
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
 * Get app count by categories for dashboard stats
 */
export async function getAppStats(): Promise<{
  total: number;
  byCategory: Record<AppCategories, number>;
  popular: AppManifestEntry[];
}> {
  const manifest = await getAppManifest();

  const byCategory = manifest.reduce((acc, app) => {
    acc[app.category] = (acc[app.category] || 0) + 1;
    return acc;
  }, {} as Record<AppCategories, number>);

  // Sort by category frequency for "popular" apps
  const categoryFrequency = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category as AppCategories);

  const popular = manifest.filter((app) => categoryFrequency.includes(app.category)).slice(0, 6);

  return {
    total: manifest.length,
    byCategory,
    popular,
  };
}
