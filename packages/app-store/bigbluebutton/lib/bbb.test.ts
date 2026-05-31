import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildApiUrl, buildQueryString, computeChecksum } from "./bbb";

describe("bbb", () => {
  describe("buildQueryString", () => {
    it("builds a query string from params", () => {
      const result = buildQueryString({ meetingID: "abc", name: "Test" });
      expect(result).toBe("meetingID=abc&name=Test");
    });

    it("skips empty values", () => {
      const result = buildQueryString({ meetingID: "abc", name: "" });
      expect(result).toBe("meetingID=abc");
    });

    it("returns empty string for empty params", () => {
      expect(buildQueryString({})).toBe("");
    });

    it("encodes special characters", () => {
      const result = buildQueryString({ name: "Hello World" });
      expect(result).toBe("name=Hello%20World");
    });
  });

  describe("computeChecksum", () => {
    it("produces valid SHA-1 checksum per BBB spec", () => {
      const result = computeChecksum("create", "name=Test&meetingID=abc", "supersecret");
      const expected = createHash("sha1").update("createname=Test&meetingID=abcsupersecret").digest("hex");
      expect(result).toBe(expected);
    });
  });

  describe("buildApiUrl", () => {
    it("builds a correctly signed API URL", () => {
      const url = buildApiUrl("https://bbb.example.com", "create", { name: "Test", meetingID: "abc" }, "secret");
      expect(url).toContain("https://bbb.example.com/bigbluebutton/api/create?");
      expect(url).toContain("name=Test");
      expect(url).toContain("meetingID=abc");
      expect(url).toContain("&checksum=");
    });

    it("strips trailing slash from base URL", () => {
      const url = buildApiUrl("https://bbb.example.com/", "create", { meetingID: "abc" }, "secret");
      expect(url).toContain("https://bbb.example.com/bigbluebutton/api/create?");
      expect(url).not.toContain("//bigbluebutton");
    });

    it("works with no params", () => {
      const url = buildApiUrl("https://bbb.example.com", "end", {}, "secret");
      const expectedChecksum = createHash("sha1").update("endsecret").digest("hex");
      expect(url).toBe(`https://bbb.example.com/bigbluebutton/api/end?checksum=${expectedChecksum}`);
    });
  });
});
