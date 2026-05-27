import { createHash } from "crypto";

import { describe, expect, it } from "vitest";

import { buildApiUrl, buildQueryString, computeChecksum } from "./bbb";

describe("BigBlueButton API helpers", () => {
  describe("buildQueryString", () => {
    it("sorts parameters alphabetically", () => {
      const result = buildQueryString({
        zebra: "1",
        alpha: "2",
        middle: "3",
      });
      expect(result).toBe("alpha=2&middle=3&zebra=1");
    });

    it("handles empty params", () => {
      const result = buildQueryString({});
      expect(result).toBe("");
    });

    it("encodes special characters in values", () => {
      const result = buildQueryString({
        name: "Test Meeting & More",
      });
      expect(result).toBe("name=Test%20Meeting%20%26%20More");
    });
  });

  describe("computeChecksum", () => {
    it("computes correct SHA-1 checksum", () => {
      const result = computeChecksum("create", "name=Test&meetingID=abc", "supersecret");
      const expected = createHash("sha1")
        .update("createname=Test&meetingID=abcsupersecret")
        .digest("hex");
      expect(result).toBe(expected);
    });

    it("produces different checksums for different secrets", () => {
      const checksum1 = computeChecksum("create", "name=Test", "secret1");
      const checksum2 = computeChecksum("create", "name=Test", "secret2");
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe("buildApiUrl", () => {
    it("builds a complete API URL with checksum", () => {
      const url = buildApiUrl("https://bbb.example.com", "create", { name: "Test" }, "mysecret");
      expect(url).toMatch(/^https:\/\/bbb.example.com\/api\/create\?/);
      expect(url).toContain("name=Test");
      expect(url).toContain("checksum=");
    });

    it("strips trailing slashes from the base URL", () => {
      const url = buildApiUrl("https://bbb.example.com///", "create", { name: "Test" }, "secret");
      expect(url).toMatch(/^https:\/\/bbb.example.com\/api\/create/);
    });
  });
});
