import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildSignedBigBlueButtonUrl, normalizeBigBlueButtonBaseUrl, sanitizeMeetingId } from "./bbbApi";

describe("BigBlueButton API helpers", () => {
  it("normalizes server, API, and root URLs to the BigBlueButton base URL", () => {
    expect(normalizeBigBlueButtonBaseUrl("https://bbb.example.com")).toBe(
      "https://bbb.example.com/bigbluebutton"
    );
    expect(normalizeBigBlueButtonBaseUrl("https://bbb.example.com/bigbluebutton/api/")).toBe(
      "https://bbb.example.com/bigbluebutton"
    );
  });

  it("throws the expected error for a missing server URL", () => {
    expect(() => normalizeBigBlueButtonBaseUrl(undefined)).toThrow("BigBlueButton host is required");
  });

  it("sanitizes meeting IDs to BigBlueButton-safe characters", () => {
    expect(sanitizeMeetingId("Intro Call with Jane Doe / ACME")).toBe("Intro-Call-with-Jane-Doe-ACME");
  });

  it("builds the checksum from method name, encoded query string, and shared secret", () => {
    const params = new URLSearchParams();
    params.set("name", "Demo Meeting");
    params.set("meetingID", "demo-123");

    const expectedQuery = params.toString();
    const expectedChecksum = createHash("sha1").update(`create${expectedQuery}secret`).digest("hex");

    expect(
      buildSignedBigBlueButtonUrl({
        baseUrl: "https://bbb.example.com",
        method: "create",
        params,
        sharedSecret: "secret",
      })
    ).toBe(`https://bbb.example.com/bigbluebutton/api/create?${expectedQuery}&checksum=${expectedChecksum}`);
  });
});
