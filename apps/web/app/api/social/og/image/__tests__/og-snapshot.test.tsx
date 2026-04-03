/**
 * Visual regression tests for OG image rendering.
 *
 * These tests render each OG image component through Satori (the same engine
 * used by next/og ImageResponse) and compare the SVG output against stored
 * reference snapshots.  If the output changes — e.g. due to a Next.js or
 * Satori upgrade, a component refactor, or a styling tweak — the test fails,
 * halting deployment until the snapshots are explicitly updated.
 *
 * To update snapshots after an intentional change:
 *   npx vitest run --update <this file>
 */
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { describe, expect, test } from "vitest";

import { App, Generic, Meeting, parseSvgPaths } from "@calcom/lib/OgImages";

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
