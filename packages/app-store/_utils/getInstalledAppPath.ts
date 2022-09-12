export default function getInstalledAppPath(
  { variant, slug }: { variant?: string; slug?: string },
  locationSearch?: string
): string {
  debugger;
  const installedAppsCategories = ["conferencing", "calendar", "payment"];
  return variant
    ? installedAppsCategories.includes(variant)
      ? `/apps/installed/${variant}${
          slug ? `?hl=${slug}${locationSearch ? locationSearch?.slice(1) : ""}` : locationSearch
        }`
      : `/apps/installed/other${locationSearch ?? ""}`
    : `/apps/installed${locationSearch}`;
}
