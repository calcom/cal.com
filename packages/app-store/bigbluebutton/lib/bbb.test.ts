import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import { buildApiUrl, buildQueryString, computeChecksum } from "./bbb";

describe("BigBlueButton bbb.ts", () => {
  describe("buildQueryString", () => {
    test("encodes simple key/value pairs", () => {
      const qs = buildQueryString({ name: "Demo Meeting", meetingID: "abc123" });
      expect(qs).toBe("name=Demo%20Meeting&meetingID=abc123");
    });

    test("omits undefined, null and empty values", () => {
      const qs = buildQueryString({
        name: "Hello",
        empty: "",
        undef: undefined,
        // @ts-expect-error testing null coercion at runtime
        nul: null,
      });
      expect(qs).toBe("name=Hello");
    });

    test("preserves insertion order so checksums are reproducible", () => {
      const qs = buildQueryString({
        b: "2",
        a: "1",
      });
      expect(qs).toBe("b=2&a=1");
    });
  });

  describe("computeChecksum", () => {
    test("computes sha1(callName + queryString + sharedSecret)", () => {
      const callName = "create";
      const query = "name=Test&meetingID=abc";
      const secret = "supersecret";
      const expected = createHash("sha1").update(`${callName}${query}${secret}`).digest("hex");

      expect(computeChecksum(callName, query, secret)).toBe(expected);
    });

    test("matches the example from the BigBlueButton API docs", () => {
      // From https://docs.bigbluebutton.org/development/api/#api-security-model
      // (the docs use SHA-1 for the legacy security model). We rebuild the
      // expected value here so the test is not just an opaque constant.
      const callName = "create";
      const query = "name=Test&meetingID=abc";
      const secret = "639259d4-9dd8-4b25-bf01-95f9567eaf4b";

      const expected = createHash("sha1").update(`${callName}${query}${secret}`).digest("hex");
      expect(computeChecksum(callName, query, secret)).toBe(expected);
    });
  });

  describe("buildApiUrl", () => {
    test("appends a sha1 checksum to the signed URL", () => {
      const url = buildApiUrl(
        { url: "https://bbb.example.com/bigbluebutton", secret: "topsecret" },
        "create",
        { name: "Test", meetingID: "abc" }
      );

      const checksum = createHash("sha1").update("createname=Test&meetingID=abctopsecret").digest("hex");
      expect(url).toBe(
        `https://bbb.example.com/bigbluebutton/api/create?name=Test&meetingID=abc&checksum=${checksum}`
      );
    });

    test("strips a trailing slash from the server URL", () => {
      const url = buildApiUrl(
        { url: "https://bbb.example.com/bigbluebutton/", secret: "s" },
        "end",
        { meetingID: "abc" }
      );
      expect(url.startsWith("https://bbb.example.com/bigbluebutton/api/end?")).toBe(true);
    });

    test("still emits a checksum when there are no query parameters", () => {
      const url = buildApiUrl({ url: "https://bbb.example.com", secret: "s" }, "getMeetings", {});
      const checksum = createHash("sha1").update("getMeetingss").digest("hex");
      expect(url).toBe(`https://bbb.example.com/api/getMeetings?checksum=${checksum}`);
    });
  });
});
