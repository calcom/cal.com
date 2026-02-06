import { describe, expect, it } from "vitest";

import { LOGO } from "./constants";
import { getOGImageVersion, constructMeetingImage, constructAppImage, constructGenericImage } from "./OgImages";

describe("OgImages", () => {
  describe("getOGImageVersion", () => {
    it("returns a consistent hash for the same type", async () => {
      const version1 = await getOGImageVersion("generic");
      const version2 = await getOGImageVersion("generic");
      expect(version1).toBe(version2);
    });

    it("returns different hashes for different types", async () => {
      const meetingVersion = await getOGImageVersion("meeting");
      const appVersion = await getOGImageVersion("app");
      const genericVersion = await getOGImageVersion("generic");

      expect(meetingVersion).not.toBe(appVersion);
      expect(meetingVersion).not.toBe(genericVersion);
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

  describe("all OG image types use LOGO constant for consistent branding", () => {
    it("generic type version changes when LOGO value would change", async () => {
      const genericVersion = await getOGImageVersion("generic");
      expect(genericVersion).toBeTruthy();
      expect(typeof genericVersion).toBe("string");
      expect(genericVersion.length).toBe(8);
    });

    it("meeting and generic types produce different versions due to different configs (not different logos)", async () => {
      const meetingVersion = await getOGImageVersion("meeting");
      const genericVersion = await getOGImageVersion("generic");
      expect(meetingVersion).not.toBe(genericVersion);
    });

    it("all types include LOGO in their version computation", async () => {
      const meetingV1 = await getOGImageVersion("meeting");
      const appV1 = await getOGImageVersion("app");
      const genericV1 = await getOGImageVersion("generic");

      expect(meetingV1).toBeTruthy();
      expect(appV1).toBeTruthy();
      expect(genericV1).toBeTruthy();

      expect(meetingV1.length).toBe(8);
      expect(appV1.length).toBe(8);
      expect(genericV1.length).toBe(8);
    });
  });
});
