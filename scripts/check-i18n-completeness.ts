import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.join(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "packages/i18n/locales");
const I18N_CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "i18n.json"), "utf-8"));

// Fix 1: validate config structure
if (!I18N_CONFIG?.locale?.source || !Array.isArray(I18N_CONFIG?.locale?.targets)) {
  console.error("❌ Invalid i18n.json structure: expected { locale: { source: string, targets: string[] } }");
  process.exit(1);
}

const BASE_LOCALE: string = I18N_CONFIG.locale.source;
const TARGET_LOCALES: string[] = I18N_CONFIG.locale.targets;

const VERBOSE = process.argv.includes("--verbose");
const BASE_REF = process.env.GITHUB_BASE_REF || null;

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

function getKeysFromGitRef(ref: string, filePath: string): Set<string> | null {
  try {
    const relativePath = path.relative(ROOT, filePath);
    const content = execSync(`git show origin/${ref}:${relativePath}`, { cwd: ROOT }).toString();
    return new Set(getKeys(JSON.parse(content)));
  } catch {
    return null;
  }
}

// Fix 2: validate base locale file exists
const baseFile = path.join(LOCALES_DIR, BASE_LOCALE, "common.json");
if (!fs.existsSync(baseFile)) {
  console.error(`❌ Base locale file not found: ${baseFile}`);
  process.exit(1);
}
const baseKeys = new Set(getKeys(loadJSON(baseFile)));

let hasErrors = false;
const summary: { locale: string; newMissing: number; keys: string[] }[] = [];

for (const locale of TARGET_LOCALES) {
  const localeFile = path.join(LOCALES_DIR, locale, "common.json");

  if (!fs.existsSync(localeFile)) {
    console.warn(`⚠️  [${locale}] file not found — skipping`);
    continue;
  }

  const currentKeys = new Set(getKeys(loadJSON(localeFile)));
  const allMissing = [...baseKeys].filter((k) => !currentKeys.has(k));

  if (BASE_REF) {
    const baseLocaleKeys = getKeysFromGitRef(BASE_REF, localeFile);
    const previouslyMissing = baseLocaleKeys
      ? new Set([...baseKeys].filter((k) => !baseLocaleKeys.has(k)))
      : new Set<string>();

    const newMissing = allMissing.filter((k) => !previouslyMissing.has(k));

    // Fix 3: early continue to reduce nesting
    if (newMissing.length > 0) {
      summary.push({ locale, newMissing: newMissing.length, keys: newMissing });
      hasErrors = true;
      if (VERBOSE) {
        console.error(`\n❌ [${locale}] ${newMissing.length} newly missing key(s):`);
        newMissing.forEach((k) => console.error(`   - ${k}`));
      }
      continue;
    }

    if (allMissing.length > 0) {
      console.log(`⚠️  [${locale}] ${allMissing.length} pre-existing missing key(s) (not blocking)`);
      continue;
    }

    console.log(`✅ [${locale}] complete`);
  } else {
    if (allMissing.length > 0) {
      console.warn(`⚠️  [${locale}] ${allMissing.length} missing key(s)`);
    } else {
      console.log(`✅ [${locale}] complete`);
    }
  }
}

if (BASE_REF) {
  if (hasErrors) {
    console.error("\n── Newly Missing Keys (regressions) ────────────");
    summary.forEach(({ locale, newMissing }) =>
      console.error(`   ❌ ${locale.padEnd(8)} ${newMissing} new missing key(s)`)
    );
    console.error("\nRun with --verbose to see all missing keys per locale");
    console.error("❌ i18n check FAILED — this PR introduces new missing translations\n");
    process.exit(1);
  } else {
    console.log("\n✅ No new missing translations introduced by this PR");
  }
} else {
  console.log("\nℹ️  Run in CI with GITHUB_BASE_REF set to detect regressions");
}