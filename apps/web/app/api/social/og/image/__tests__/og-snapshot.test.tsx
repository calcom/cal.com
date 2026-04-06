/**
 * Visual regression tests for OG image rendering.
 *
 * ## How this guards against Next.js upgrades
 *
 * In production, `next/og` uses a **bundled** copy of `@vercel/og` (which
 * embeds Satori) to render OG images.  When Next.js is upgraded the bundled
 * `@vercel/og` version can change, pulling in a different Satori that may
 * alter rendering and break OG images (as happened in the Next.js 16.2.1
 * upgrade).
 *
 * Ideally we would call `ImageResponse` from `next/og` directly here so the
 * test exercises the exact same code path as production.  However, Vitest's
 * Vite-based module transform rewrites `import.meta.url` inside the bundled
 * `@vercel/og`, which breaks WASM file-path resolution (`resvg.wasm` for
 * PNG rendering, `yoga-layout` WASM in newer Satori versions) and makes
 * `ImageResponse` unusable in this test environment.
 *
 * Instead we use a **two-layer** approach:
 *
 * 1. **Version-change detector** — snapshots the `@vercel/og` version that
 *    Next.js bundles internally.  When a Next.js upgrade ships a different
 *    `@vercel/og`, this snapshot fails immediately, alerting the developer
 *    that the production Satori version has changed and OG images may render
 *    differently.  The developer should then:
 *      a. Verify OG images still render correctly in a production-like
 *         environment (e.g. `next build && next start`, or a preview deploy).
 *      b. Upgrade `@vercel/og` in `packages/lib/package.json` to match the
 *         new bundled version (so the Satori used here stays in sync).
 *      c. If the new Satori has WASM compatibility issues with Vitest,
 *         find a workaround or pin to the last compatible version and
 *         document the gap.
 *      d. Update snapshots: `npx vitest run --update <this file>`
 *
 * 2. **SVG snapshot tests** — render each OG component through `satori`
 *    (from the standalone `@vercel/og`) and compare against stored reference
 *    SVGs.  Any rendering difference caused by component changes is caught
 *    here.  Because the version-change detector ensures developers keep the
 *    standalone `@vercel/og` in sync with the bundled one, the Satori
 *    version used here should match production.
 *
 * Together: upgrade Next.js → detector fires → developer syncs `@vercel/og`
 * and verifies OG images → snapshots are updated if rendering changed.
 *
 * To update snapshots after an intentional change:
 *   TZ=UTC npx vitest run --update apps/web/app/api/social/og/image/__tests__/og-snapshot.test.tsx
 */
import fs from "node:fs";
import path from "node:path";
import { App, Generic, Meeting, parseSvgPaths } from "@calcom/lib/OgImages";
import satori from "satori";
import { describe, expect, test } from "vitest";

// Load fonts from the public directory — same fonts used in the real OG route.
const FONTS_DIR = path.resolve(__dirname, "../../../../../../public/fonts");
const calFont = fs.readFileSync(path.join(FONTS_DIR, "cal.ttf"));
const interRegular = fs.readFileSync(path.join(FONTS_DIR, "Inter-Regular.ttf"));
const interMedium = fs.readFileSync(path.join(FONTS_DIR, "Inter-Medium.ttf"));

const SATORI_FONTS: Parameters<typeof satori>[1]["fonts"] = [
  { name: "inter", data: interRegular, weight: 400 },
  { name: "inter", data: interMedium, weight: 500 },
  { name: "cal", data: calFont, weight: 400 },
  { name: "cal", data: calFont, weight: 600 },
];

const OG_SIZE = { width: 1200, height: 630 };

// Load the real Cal.com logo SVG paths — same source of truth as production.
const LOGOS_DIR = path.resolve(__dirname, "../../../../../../public");
const darkLogoSvg = fs.readFileSync(path.join(LOGOS_DIR, "calcom-logo-white-word.svg"), "utf-8");
const lightLogoSvg = fs.readFileSync(path.join(LOGOS_DIR, "cal-logo-word-black.svg"), "utf-8");
const darkLogoPaths = parseSvgPaths(darkLogoSvg);
const lightLogoPaths = parseSvgPaths(lightLogoSvg);

/** Snapshot directory — stores the reference SVG files. */
const SNAP_DIR = path.resolve(__dirname, "__snapshots__");

/**
 * Version-change detector: fails when the @vercel/og version bundled inside
 * Next.js changes.  See the file-level JSDoc for the full rationale and the
 * remediation steps a developer should follow when this test breaks.
 */
describe("OG image version-change detector", () => {
  test("bundled @vercel/og version has not changed", () => {
    const bundledPkgPath = require.resolve("next/dist/compiled/@vercel/og/package.json");
    const bundledVersion = JSON.parse(fs.readFileSync(bundledPkgPath, "utf-8")).version;

    expect(bundledVersion).toMatchInlineSnapshot(`"0.11.1"`);
  });
});

describe("OG image visual regression (Satori SVG snapshots)", () => {
  test("Meeting OG image matches snapshot", async () => {
    const svg = await satori(
      <Meeting
        title="30min Meeting"
        profile={{ name: "Test User" }}
        users={[{ name: "Test User", username: "testuser" }]}
        logoPaths={darkLogoPaths}
      />,
      { ...OG_SIZE, fonts: SATORI_FONTS }
    );

    await expect(svg).toMatchFileSnapshot(path.join(SNAP_DIR, "meeting-og.svg"));
  });

  test("Meeting OG image with avatar matches snapshot", async () => {
    const svg = await satori(
      <Meeting
        title="30min Meeting"
        profile={{ name: "Test User", image: "https://example.com/avatar.png" }}
        users={[{ name: "Test User", username: "testuser" }]}
        logoPaths={darkLogoPaths}
      />,
      { ...OG_SIZE, fonts: SATORI_FONTS }
    );

    await expect(svg).toMatchFileSnapshot(path.join(SNAP_DIR, "meeting-with-avatar-og.svg"));
  });

  test("App OG image matches snapshot", async () => {
    const svg = await satori(
      <App
        name="Test App"
        description="A test application for snapshot testing"
        slug="test-app"
        logoUrl="/app-store/test-app/icon.svg"
        logoPaths={darkLogoPaths}
      />,
      { ...OG_SIZE, fonts: SATORI_FONTS }
    );

    await expect(svg).toMatchFileSnapshot(path.join(SNAP_DIR, "app-og.svg"));
  });

  test("Generic OG image matches snapshot", async () => {
    const svg = await satori(
      <Generic title="Test Title" description="Test description for snapshot" logoPaths={lightLogoPaths} />,
      { ...OG_SIZE, fonts: SATORI_FONTS }
    );

    await expect(svg).toMatchFileSnapshot(path.join(SNAP_DIR, "generic-og.svg"));
  });
});
