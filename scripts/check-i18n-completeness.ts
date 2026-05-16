import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "packages/i18n/locales");
const I18N_CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "i18n.json"), "utf-8"));

const BASE_LOCALE: string = I18N_CONFIG.locale.source;           // "en"
const TARGET_LOCALES: string[] = I18N_CONFIG.locale.targets;     // official list

const VERBOSE = process.argv.includes("--verbose");

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, val]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return typeof val === "object" && val !== null
      ? getKeys(val as Record<string, unknown>, full)
      : [full];
  });
}

function loadJSON(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

const baseFile = path.join(LOCALES_DIR, BASE_LOCALE, "common.json");
const baseKeys = new Set(getKeys(loadJSON(baseFile)));

let hasErrors = false;
const summary: { locale: string; missing: number }[] = [];

for (const locale of TARGET_LOCALES) {
  const localeFile = path.join(LOCALES_DIR, locale, "common.json");

  if (!fs.existsSync(localeFile)) {
    console.error(`⚠️  [${locale}] locale file not found — skipping`);
    continue;
  }

  const localeKeys = new Set(getKeys(loadJSON(localeFile)));
  const missing = [...baseKeys].filter((k) => !localeKeys.has(k));

  if (missing.length > 0) {
    summary.push({ locale, missing: missing.length });
    hasErrors = true;

    if (VERBOSE) {
      console.error(`\n❌ [${locale}] missing ${missing.length} key(s):`);
      missing.forEach((k) => console.error(`   - ${k}`));
    }
  } else {
    console.log(`✅ [${locale}] complete`);
  }
}

if (hasErrors) {
  console.error("\n── Missing Translation Summary ──────────────────");
  summary.forEach(({ locale, missing }) =>
    console.error(`   ❌ ${locale.padEnd(8)} ${missing} missing key(s)`)
  );
  console.error(`\nTotal: ${summary.length} locale(s) incomplete`);
  console.error("Run with --verbose to see all missing keys per locale");
  console.error("❌ Translation completeness check FAILED\n");
  process.exit(1);
} else {
  console.log("\n✅ All translations complete!");
}