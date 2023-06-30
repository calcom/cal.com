const glob = require("glob");
const { getSubdomainRegExp } = require("./getSubdomainRegExp");
/** Needed to rewrite public booking page, gets all static pages but [user] */
let pages = (exports.pages = glob
  .sync("pages/**/[^_]*.{tsx,js,ts}", { cwd: __dirname })
  .map((filename) =>
    filename
      .substr(6)
      .replace(/(\.tsx|\.js|\.ts)/, "")
      .replace(/\/.*/, "")
  )
  .filter((v, i, self) => self.indexOf(v) === i && !v.startsWith("[user]")));

// Following routes don't exist but they work by doing rewrite. Thus they need to be excluded from matching the orgRewrite patterns
// Make sure to keep it upto date as more nonExistingRouteRewrites are added.
const otherNonExistingRoutePrefixes = ["forms", "router", "success", "cancel"];

// .* matches / as well(Note: *(i.e wildcard) doesn't match / but .*(i.e. RegExp) does)
// It would match /free/30min but not /bookings/upcoming because 'bookings' is an item in pages
// It would also not match /free/30min/embed because we are ensuring just two slashes
// ?!book ensures it doesn't match /free/book page which doesn't have a corresponding new-booker page.
// [^/]+ makes the RegExp match the full path, it seems like a partial match doesn't work.
// book$ ensures that only /book is excluded from rewrite(which is at the end always) and not /booked

const afterFilesRewriteExcludePages = pages;
exports.userTypeRoutePath = `/:user((?!${afterFilesRewriteExcludePages.join(
  "/|"
)})[^/]*)/:type((?!book$)[^/]+)`;
exports.teamTypeRoutePath = "/team/:slug/:type((?!book$)[^/]+)";
exports.privateLinkRoutePath = "/d/:link/:slug((?!book$)[^/]+)";
exports.embedUserTypeRoutePath = `/:user((?!${afterFilesRewriteExcludePages.join("/|")})[^/]*)/:type/embed`;
exports.embedTeamTypeRoutePath = "/team/:slug/:type/embed";
let subdomainRegExp = (exports.subdomainRegExp = getSubdomainRegExp(process.env.NEXT_PUBLIC_WEBAPP_URL));
exports.orgHostPath = `^(?<orgSlug>${subdomainRegExp})\\..*`;

let beforeRewriteExcludePages = pages.concat(otherNonExistingRoutePrefixes);
exports.orgUserRoutePath = `/:user((?!${beforeRewriteExcludePages.join("|")}|_next|public)[a-zA-Z0-9\-_]+)`;
exports.orgUserTypeRoutePath = `/:user((?!${beforeRewriteExcludePages.join(
  "/|"
)}|_next/|public/)[^/]+)/:type((?!avatar\.png)[^/]+)`;
exports.orgUserTypeEmbedRoutePath = `/:user((?!${beforeRewriteExcludePages.join(
  "/|"
)}|_next/|public/)[^/]+)/:type/embed`;
