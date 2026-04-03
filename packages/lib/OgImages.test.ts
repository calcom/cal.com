import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  App,
  constructAppImage,
  constructGenericImage,
  constructMeetingImage,
  Generic,
  getOGImageVersion,
  Meeting,
  parseSvgPaths,
} from "./OgImages";

describe("OgImages", () => {
  describe("getOGImageVersion", () => {
    it("returns a consistent hash for the same type", async () => {
      const version1 = await getOGImageVersion("generic");
      const version2 = await getOGImageVersion("generic");
      expect(version1).toBe(version2);
    });

    it("returns different hash when additionalInputs are provided", async () => {
      const base = await getOGImageVersion("app");
      const withInputs = await getOGImageVersion("app", { svgHash: "abc123" });
      expect(base).not.toBe(withInputs);
    });
  });

  describe("constructMeetingImage", () => {
    it("returns an encoded URL with meeting parameters", async () => {
      const result = await constructMeetingImage({
        title: "30min",
        profile: { name: "Test User" },
        users: [],
      });
      const decoded = decodeURIComponent(result);
      expect(decoded).toContain("type=meeting");
      expect(decoded).toContain("title=30min");
      expect(decoded).toContain("meetingProfileName=Test+User");
    });

    it("includes meetingImage when profile has an image", async () => {
      const result = await constructMeetingImage({
        title: "30min",
        profile: { name: "Test User", image: "https://example.com/avatar.png" },
        users: [],
      });
      const decoded = decodeURIComponent(result);
      expect(decoded).toContain("meetingImage=https%3A%2F%2Fexample.com%2Favatar.png");
    });
  });

  describe("constructAppImage", () => {
    it("returns an encoded URL with app parameters", async () => {
      const result = await constructAppImage({
        name: "TestApp",
        slug: "test-app",
        description: "A test app",
        logoUrl: "/app-store/test/icon.svg",
      });
      const decoded = decodeURIComponent(result);
      expect(decoded).toContain("type=app");
      expect(decoded).toContain("name=TestApp");
      expect(decoded).toContain("slug=test-app");
    });
  });

  describe("constructGenericImage", () => {
    it("returns an encoded URL with generic parameters", async () => {
      const result = await constructGenericImage({
        title: "Login",
        description: "Sign in to your account",
      });
      const decoded = decodeURIComponent(result);
      expect(decoded).toContain("type=generic");
      expect(decoded).toContain("title=Login");
      expect(decoded).toContain("description=Sign+in+to+your+account");
    });
  });

  describe("OG image version hashing", () => {
    it("all three types produce distinct version hashes", async () => {
      const meetingVersion = await getOGImageVersion("meeting");
      const appVersion = await getOGImageVersion("app");
      const genericVersion = await getOGImageVersion("generic");

      expect(meetingVersion).not.toBe(appVersion);
      expect(meetingVersion).not.toBe(genericVersion);
      expect(appVersion).not.toBe(genericVersion);
    });
  });

  describe("parseSvgPaths", () => {
    it("extracts path d attributes from SVG content", () => {
      const svg = '<svg><path d="M0 0H10" fill="red"/><path d="M5 5V15" fill="blue"/></svg>';
      expect(parseSvgPaths(svg)).toEqual(["M0 0H10", "M5 5V15"]);
    });

    it("returns empty array for SVG with no paths", () => {
      expect(parseSvgPaths("<svg></svg>")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(parseSvgPaths("")).toEqual([]);
    });
  });

  // These tests guard against a regression where the Cal.com logo disappeared from
  // OG images because Satori does not support SVG images in <img> tags.  The fix
  // renders the logo as inline <svg> JSX with paths fetched from the public SVG files.
  // If someone accidentally reverts to an <img src="...svg"> approach, these tests will fail.
  describe("OG image components render inline SVG logos (Satori compatibility)", () => {
    // Minimal test paths — the real paths are fetched from the SVG files at request time
    const testLogoPaths = ["M0 0H10V10H0Z", "M20 0H30V10H20Z"];

    it("Meeting component renders inline SVG logo, not an img tag pointing to SVG", () => {
      const html = renderToStaticMarkup(
        createElement(Meeting, {
          title: "Test Meeting",
          profile: { name: "Test User" },
          users: [],
          logoPaths: testLogoPaths,
        })
      );

      // Inline SVG must be present with path elements from logoPaths
      expect(html).toContain("<svg");
      expect(html).toContain("<path");
      expect(html).toContain('viewBox="0 0 101 22"');
      expect(html).toContain('d="M0 0H10V10H0Z"');

      // No <img> tag should reference an SVG logo file.
      // Satori cannot render SVG images inside <img> tags.
      expect(html).not.toMatch(/<img[^>]*calcom-logo[^>]*\.svg/);
    });

    it("App component renders inline SVG logo, not an img tag pointing to SVG", () => {
      const html = renderToStaticMarkup(
        createElement(App, {
          name: "TestApp",
          description: "A test app",
          slug: "test-app",
          logoUrl: "/app-store/test/icon.png",
          logoPaths: testLogoPaths,
        })
      );

      expect(html).toContain("<svg");
      expect(html).toContain("<path");
      expect(html).toContain('viewBox="0 0 101 22"');
      expect(html).toContain('d="M0 0H10V10H0Z"');
      expect(html).not.toMatch(/<img[^>]*calcom-logo[^>]*\.svg/);
    });

    it("Generic component renders inline SVG logo, not an img tag pointing to SVG", () => {
      const html = renderToStaticMarkup(
        createElement(Generic, {
          title: "Test Title",
          description: "Test description",
          logoPaths: testLogoPaths,
        })
      );

      expect(html).toContain("<svg");
      expect(html).toContain("<path");
      expect(html).toContain('viewBox="0 0 101 22"');
      expect(html).toContain('d="M0 0H10V10H0Z"');
      expect(html).not.toMatch(/<img[^>]*calcom-logo[^>]*\.svg/);
    });

    it("Meeting component renders avatar image when profile image is provided", () => {
      const avatarUrl = "https://example.com/avatar.png";
      const html = renderToStaticMarkup(
        createElement(Meeting, {
          title: "Test Meeting",
          profile: { name: "Test User", image: avatarUrl },
          users: [],
          logoPaths: testLogoPaths,
        })
      );

      // Avatar should be present as an <img> tag
      expect(html).toContain(avatarUrl);
      expect(html).toMatch(/<img[^>]*avatar\.png/);
    });
  });
});
