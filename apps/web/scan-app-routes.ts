import { sync as globSync } from "glob";

/**
 * Shared constants and scanning logic for app route names.
 *
 * ## What are these routes used for?
 *
 * On org subdomains (e.g. acme.cal.com), next.config.ts adds `beforeFiles` rewrites that
 * turn user/team booking URLs into internal org routes:
 *
 *   acme.cal.com/john/30min  →  (rewritten to)  /org/acme/john/30min
 *
 * Without this rewrite, Next.js would look for pages/john/30min which doesn't exist → 404.
 * The rewrite pattern uses a negative lookahead to EXCLUDE known app routes:
 *
 *   /:user((?!settings/|team/|bookings/|...)[^/]+)/:type
 *
 * Without the exclusion, acme.cal.com/settings would be rewritten to /org/acme/settings,
 * treating "settings" as a username instead of showing the settings page.
 *
 * ## Why the same routes must be reserved as slugs
 *
 * The routes excluded from rewrite are exactly the ones that conflict with usernames.
 * If "team" is excluded from the rewrite, a user named "team" on acme.cal.com/team would
 * hit the app's /team route instead of being rewritten to their booking page — producing a 404.
 * This is the bug (ENG-673) this module helps prevent: by blocking these routes as user/team slugs.
 *
 * ## Two consumers, one source
 *
 * - pagesAndRewritePaths.ts — runtime filesystem scan for next.config.ts rewrites
 * - scripts/generate-app-reserved-route-slugs.ts — generates a static snapshot for
 *   isReservedRouteSlug() in packages/lib/ (used for slug validation at signup/team creation)
 *
 * ## Why next.config.ts doesn't use the generated file
 *
 * A stale generated file would only affect slug validation (fixable, no data loss).
 * If next.config.ts also depended on it, stale data would break routing in production.
 * The runtime scan is a safety net. A sync test verifies the generated file stays current.
 */

export const APP_ROUTE_GLOB_PATTERN =
  "{pages,app,app/(booking-page-wrapper),app/(use-page-wrapper),app/(use-page-wrapper)/(main-nav)}/**/[^_]*.{tsx,js,ts}";

export const EXCLUDED_ROUTE_PREFIXES = [
  "[user]",
  "_trpc",
  "layout",
  "layoutHOC",
  "WithAppDirSsg",
  "global-error",
  "WithAppDirSsr",
  "WithEmbedSSR",
  "WithEmbedSSR.test",
  "ShellMainAppDir",
  "ShellMainAppDirBackButton",
];
// Routes NOT excluded from org rewrite — they CAN be used as user/team slugs.
// On org domains, the rewrite handles them as booking pages (acme.cal.com/onboarding → user "onboarding").
// On non-org cal.com/onboarding, the app route wins — but it's behind auth, so no public conflict.
// These are also NOT reserved as slugs (users/teams can use them).
export const WHITELISTED_ROUTE_NAMES = ["onboarding"];

// Routes that don't exist as files but work via rewrites in next.config.ts.
// "app" is reserved for the Cal.com Companion landing page served by Framer.
// Following routes don't exist but they work by doing rewrite. Thus they need to be excluded from matching the orgRewrite patterns
// Make sure to keep it upto date as more nonExistingRouteRewrites are added.
export const VIRTUAL_ROUTES = ["forms", "router", "success", "cancel", "app"];

/**
 * Scans the apps/web filesystem for top-level route names.
 * Returns deduplicated route names with excluded prefixes and whitelisted routes filtered out.
 *
 * Tested transitively (no separate unit test needed):
 * - pagesAndRewritePaths.test.ts — verifies output contains expected routes, excludes whitelisted,
 *   and the generated snapshot stays in sync with the runtime scan
 * - next-config.test.ts — verifies rewrite patterns built from this output correctly match/reject URLs
 */
export function scanAppRoutes(cwd: string): string[] {
  return globSync(APP_ROUTE_GLOB_PATTERN, { cwd })
    .map((filename) =>
      filename
        // Remove the directory prefix (pages/, app/ and route group folders)
        .replace(
          /^(app\/\(use-page-wrapper\)\/\(main-nav\)|app\/\(use-page-wrapper\)|app\/\(booking-page-wrapper\)|pages|app)\//,
          ""
        )
        // Remove file extensions
        .replace(/(\.tsx|\.js|\.ts)/, "")
        // Extract only the top-level route name (e.g., /abc/def -> abc)
        .replace(/\/.*/, "")
    )
    .filter(
      (v, i, self) =>
        self.indexOf(v) === i && !EXCLUDED_ROUTE_PREFIXES.some((prefix) => v.startsWith(prefix))
    )
    .filter((page) => !WHITELISTED_ROUTE_NAMES.includes(page));
}
