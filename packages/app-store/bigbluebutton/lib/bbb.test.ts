import { describe, expect, it } from "vitest";
import { buildQueryString, computeChecksum, buildApiUrl } from "./bbb";

describe("BigBlueButton Utility Functions", () => {
  describe("buildQueryString", () => {
    it("should build a standard query string from key-value pairs", () => {
      const params = {
        meetingID: "xyz",
        name: "abc",
        attendeePW: "apw123",
      };
      expect(buildQueryString(params)).toBe("meetingID=xyz&name=abc&attendeePW=apw123");
    });

    it("should URL encode parameters correctly", () => {
      const params = {
        name: "John Doe & Co.",
        topic: "API testing/demo",
      };
      expect(buildQueryString(params)).toBe("name=John%20Doe%20%26%20Co.&topic=API%20testing%2Fdemo");
    });

    it("should ignore undefined and null values", () => {
      const params = {
        meetingID: "xyz",
        name: undefined,
        password: null,
        redirect: true,
      };
      expect(buildQueryString(params)).toBe("meetingID=xyz&redirect=true");
    });

    it("should return an empty string for empty input", () => {
      expect(buildQueryString({})).toBe("");
    });
  });

  describe("computeChecksum", () => {
    it("should calculate correct hash matching standard sha1 digest", () => {
      // concatenation: "testquerysecret" -> sha1: "75c0c0dc014d4b2248e919c10381799698f68eb7"
      expect(computeChecksum("test", "query", "secret")).toBe("75c0c0dc014d4b2248e919c10381799698f68eb7");
    });
  });

  describe("buildApiUrl", () => {
    const serverUrl = "https://bbb.example.com/bigbluebutton/api";
    const sharedSecret = "my-secret";

    it("should build correct URL with query params and checksum", () => {
      const url = buildApiUrl(serverUrl, "create", { meetingID: "123" }, sharedSecret);
      const expectedChecksum = computeChecksum("create", "meetingID=123", sharedSecret);
      expect(url).toBe(`${serverUrl}/create?meetingID=123&checksum=${expectedChecksum}`);
    });

    it("should strip trailing slashes from serverUrl", () => {
      const messyUrl = "https://bbb.example.com/bigbluebutton/api///";
      const url = buildApiUrl(messyUrl, "create", { meetingID: "123" }, sharedSecret);
      const expectedChecksum = computeChecksum("create", "meetingID=123", sharedSecret);
      expect(url).toBe(`${serverUrl}/create?meetingID=123&checksum=${expectedChecksum}`);
    });

    it("should handle empty params case", () => {
      const url = buildApiUrl(serverUrl, "getMeetings", {}, sharedSecret);
      const expectedChecksum = computeChecksum("getMeetings", "", sharedSecret);
      expect(url).toBe(`${serverUrl}/getMeetings?checksum=${expectedChecksum}`);
    });
  });
});
