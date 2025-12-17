/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const glob = require("glob");
const { nextJsOrgRewriteConfig } = require("./getNextjsOrgRewriteConfig");

// Top-level route names that are explicitly allowed for org rewrite (whitelist)

const topLevelRouteNamesWhitelistedForRewrite = (exports.topLevelRouteNamesWhitelistedForRewrite = [
  // We don't allow all dashboard route names to be used as slug because people are probably accustomed to access links like acme.cal.com/workflows, acme.cal.com/event-types etc.
  // So, we carefully allow, what is absolutely needed.
  // Allowed to be a team/user slug in organization because onboarding is a common team name
  "onboarding",
]);

/**
 * Extracts top-level route names from all pages/app files and excludes them from org rewrite.
 * For example: /abc/def/ghi -> 'abc'
 *
 * These top-level route names are excluded from rewrites in beforeFiles in next.config.js
 * to prevent conflicts with organization slug rewrites.
 */
/* eslint-disable no-undef */
let topLevelRoutesExcludedFromOrgRewrite = (exports.topLevelRoutesExcludedFromOrgRewrite = glob
  .sync(
    "{pages,app,app/(booking-page-wrapper),app/(use-page-wrapper),app/(use-page-wrapper)/(main-nav)}/**/[^_]*.{tsx,js,ts}",
    {
      cwd: __dirname,
    }
  )
  .map((filename) =>
    filename
      // Remove the directory prefix (pages/, app/ and route group folders.)
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
      self.indexOf(v) === i &&
      ![
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
      ].some((prefix) => v.startsWith(prefix))
  )
  .filter((page) => {
    return !topLevelRouteNamesWhitelistedForRewrite.includes(page);
  }));

// .* matches / as well(Note: *(i.e wildcard) doesn't match / but .*(i.e. RegExp) does)
// It would match /free/30min but not /bookings/upcoming because 'bookings' is an item in pages
// It would also not match /free/30min/embed because we are ensuring just two slashes
// ?!book ensures it doesn't match /free/book page which doesn't have a corresponding new-booker page.
// [^/]+ makes the RegExp match the full path, it seems like a partial match doesn't work.
// book$ ensures that only /book is excluded from rewrite(which is at the end always) and not /booked
/* eslint-disable no-undef */
exports.nextJsOrgRewriteConfig = nextJsOrgRewriteConfig;

/**
 * Returns a regex that matches all existing routes, virtual routes (like /forms, /router, /success etc) and nextjs special paths (_next, public)
 * @param {string} suffix - The suffix to append to each route in the regex
 */
function getRegExpMatchingAllReservedRoutes(suffix) {
  // Following routes don't exist but they work by doing rewrite. Thus they need to be excluded from matching the orgRewrite patterns
  // Make sure to keep it upto date as more nonExistingRouteRewrites are added.
  // "app" is reserved for the Cal.com Companion landing page served by Framer at cal.com/app.
  // The browser extension redirects users to cal.com/app when clicked on restricted pages (like chrome://newtab).
  // Without this reservation, /app would be treated as a username lookup and show "username available" error.
  const otherNonExistingRoutePrefixes = ["forms", "router", "success", "cancel", "app"];

  // Most files/dirs in public dir must not be rewritten to org pages. Ideally it should be all the content of public dir, but that can be done later
  // It is important to exclude the embed pages separately here because with SINGLE_ORG_SLUG enabled, the entire domain is eligible for rewrite vs just the org subdomain otherwise
  const staticAssets = ["embed"];

  // FIXME: I am not sure why public is needed here, an asset 'test' in public isn't accessible through "/public/test" but only through "/test"
  // We should infact scan through all files in public and exclude them instead.
  const nextJsSpecialPaths = ["_next", "public"];

  let allTopLevelRoutesExcludedFromOrgRewrite = topLevelRoutesExcludedFromOrgRewrite
    .concat(otherNonExistingRoutePrefixes)
    .concat(nextJsSpecialPaths)
    .concat(staticAssets);
  return allTopLevelRoutesExcludedFromOrgRewrite.join(`${suffix}|`) + suffix;
}

// To handle /something
exports.orgUserRoutePath = `/:user((?!${getRegExpMatchingAllReservedRoutes("/?$")})[a-zA-Z0-9\-_]+)`;

// To handle /something/somethingelse
exports.orgUserTypeRoutePath = `/:user((?!${getRegExpMatchingAllReservedRoutes(
  "/"
)})[^/]+)/:type((?!avatar\.png)[^/]+)`;

// To handle /something/somethingelse/embed
exports.orgUserTypeEmbedRoutePath = `/:user((?!${getRegExpMatchingAllReservedRoutes("/")})[^/]+)/:type/embed`;
