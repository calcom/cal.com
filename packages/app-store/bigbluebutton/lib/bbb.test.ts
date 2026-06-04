import { describe, it, expect } from "vitest";

import { buildQueryString, computeChecksum, buildApiUrl } from "./bbb";

describe("BigBlueButton API helpers", () => {
  describe("buildQueryString", () => {
    it("encodes params into a query string", () => {
      const qs = buildQueryString({ meetingID: "abc-123", name: "Test Meeting" });
      expect(qs).toBe("meetingID=abc-123&name=Test%20Meeting");
    });

    it("skips empty values", () => {
      const qs = buildQueryString({ a: "1", b: "", c: "3" });
      expect(qs).toBe("a=1&c=3");
    });
  });

  describe("computeChecksum", () => {
    it("produces a valid SHA-1 hex digest", () => {
      const checksum = computeChecksum("create", "meetingID=test", "secret123");
      expect(checksum).toMatch(/^[a-f0-9]{40}$/);
    });

    it("produces different checksums for different inputs", () => {
      const a = computeChecksum("create", "meetingID=1", "secret");
      const b = computeChecksum("create", "meetingID=2", "secret");
      expect(a).not.toBe(b);
    });
  });

  describe("buildApiUrl", () => {
    it("builds a complete BBB API URL with checksum", () => {
      const url = buildApiUrl("https://bbb.example.com", "create", { meetingID: "test" }, "secret");
      expect(url).toContain("https://bbb.example.com/api/create?");
      expect(url).toContain("meetingID=test");
      expect(url).toContain("checksum=");
    });

    it("strips trailing slashes from base URL", () => {
      const url = buildApiUrl("https://bbb.example.com///", "join", { meetingID: "x" }, "s");
      expect(url).toContain("https://bbb.example.com/api/join?");
    });
  });
});
