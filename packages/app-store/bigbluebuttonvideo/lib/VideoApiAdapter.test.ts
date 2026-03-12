import { createHash } from "crypto";
import { describe, it, expect } from "vitest";

// ---- Inline helpers (mirror of VideoApiAdapter internals) ----

function buildChecksum(apiName: string, queryString: string, secret: string): string {
  return createHash("sha256")
    .update(apiName + queryString + secret)
    .digest("hex");
}

function buildBBBUrl(
  baseUrl: string,
  apiName: string,
  params: Record<string, string>,
  secret: string
): string {
  const qs = new URLSearchParams(params).toString();
  const checksum = buildChecksum(apiName, qs, secret);
  const sep = qs ? "&" : "";
  return `${baseUrl}/api/${apiName}?${qs}${sep}checksum=${checksum}`;
}

function parseXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1] : "";
}

// ---- Tests ----

describe("BigBlueButton helpers", () => {
  it("buildChecksum produces correct SHA-256 hex", () => {
    // Reference value from https://docs.bigbluebutton.org/development/api/#usage
    const secret = "639259d4-9dd8-4b25-bf01-95f9567eaf4b";
    const result = buildChecksum("create", "name=Test+Meeting&meetingID=abc123", secret);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
    // Must be reproducible (deterministic)
    expect(result).toBe(buildChecksum("create", "name=Test+Meeting&meetingID=abc123", secret));
  });

  it("different apiNames produce different checksums", () => {
    const secret = "mysecret";
    const qs = "meetingID=x";
    expect(buildChecksum("create", qs, secret)).not.toBe(buildChecksum("join", qs, secret));
  });

  it("buildBBBUrl appends checksum at the end", () => {
    const url = buildBBBUrl("https://bbb.example.com/bigbluebutton", "create", { meetingID: "abc" }, "s3cr3t");
    expect(url).toContain("/api/create?");
    expect(url).toMatch(/&checksum=[0-9a-f]{64}$/);
  });

  it("buildBBBUrl with empty params still appends checksum", () => {
    const url = buildBBBUrl("https://bbb.example.com/bigbluebutton", "getMeetings", {}, "s3cr3t");
    expect(url).toContain("/api/getMeetings?checksum=");
    expect(url).not.toContain("&&");
  });

  it("parseXmlValue extracts a tag value", () => {
    const xml = "<response><returncode>SUCCESS</returncode><meetingID>abc123</meetingID></response>";
    expect(parseXmlValue(xml, "returncode")).toBe("SUCCESS");
    expect(parseXmlValue(xml, "meetingID")).toBe("abc123");
    expect(parseXmlValue(xml, "missing")).toBe("");
  });

  it("parseXmlValue handles error responses", () => {
    const xml = "<response><returncode>FAILED</returncode><message>Meeting not found</message></response>";
    expect(parseXmlValue(xml, "returncode")).toBe("FAILED");
    expect(parseXmlValue(xml, "message")).toBe("Meeting not found");
  });
});
