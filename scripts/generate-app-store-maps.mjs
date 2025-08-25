// scripts/generate-app-store-maps.mjs
// Generate factory-based maps for calendar/payment/crm/conferencing/analytics.
// Each entry is () => import("./<slug>/index") so consumers can await the module lazily.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_STORE = path.join(ROOT, "packages", "app-store");

const CATEGORIES = [
  {
    name: "calendar",
    signature: "lib/CalendarService.ts",
    exportName: "CALENDAR_SERVICES",
    outFile: "calendar.services.generated.ts",
  },
  {
    name: "analytics",
    signature: "lib/AnalyticsService.ts",
    exportName: "ANALYTICS_APPS",
    outFile: "analytics.apps.generated.ts",
  },
  {
    name: "payment",
    signature: "lib/PaymentService.ts",
    exportName: "PAYMENT_APPS",
    outFile: "payment.apps.generated.ts",
  },
  {
    name: "crm",
    signature: "lib/CrmService.ts",
    exportName: "CRM_SERVICES",
    outFile: "crm.services.generated.ts",
  },
  {
    name: "conferencing",
    signature: "lib/VideoApiAdapter.ts",
    exportName: "VIDEO_ADAPTERS",
    outFile: "conferencing.videoAdapters.generated.ts",
  }
];

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}
function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function listAppSlugs() {
  return fs.readdirSync(APP_STORE)
    .filter((n) => !n.startsWith("."))
    .filter((n) => isDir(path.join(APP_STORE, n)));
}

function findSlugsWithSignature(slugs, relSig) {
  return slugs.filter((slug) =>
    exists(path.join(APP_STORE, slug, relSig)) &&
    (exists(path.join(APP_STORE, slug, "index.ts"))
      || exists(path.join(APP_STORE, slug, "index.tsx"))
      || exists(path.join(APP_STORE, slug, "index.js")))
  );
}

function normalizeKey(slug) {
  // Lowercase, strip out all non-alphanumeric chars
  // "ics-feed_calendar" -> "icsfeedcalendar"
  return slug.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function writeFactoryMap({ exportName, outFile, slugs }) {
  const lines = [
    "// AUTO-GENERATED. Do not edit.",
    "/* eslint-disable */",
    `export const ${exportName} = {`,
    ...slugs.map(
      (slug) =>
        `  "${normalizeKey(slug)}": () => import("./${slug}/index"),`
    ),
    `} as const;`,
    "",
  ];
  const outPath = path.join(APP_STORE, outFile);
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(
    `✔ wrote ${path.relative(ROOT, outPath)} (${slugs.length} entries)`
  );
}


(function main() {
  if (!isDir(APP_STORE)) {
    console.error(`Not found: ${APP_STORE}`);
    process.exit(1);
  }
  const slugs = listAppSlugs();
  for (const cat of CATEGORIES) {
    const matches = findSlugsWithSignature(slugs, cat.signature);
    writeFactoryMap({ exportName: cat.exportName, outFile: cat.outFile, slugs: matches });
  }
})();
