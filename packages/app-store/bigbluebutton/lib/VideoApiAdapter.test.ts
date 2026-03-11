import { describe, expect, it } from "vitest";

import { buildBBBUrl, computeChecksum, parseXmlValue } from "./VideoApiAdapter";

describe("BigBlueButton VideoApiAdapter helpers", () => {
  it("computes SHA256 checksum for BBB api calls", () => {
    const checksum = computeChecksum("create", "name=Test&meetingID=abc", "secret123");
    expect(checksum).toHaveLength(64);
    expect(checksum).toMatch(/^[a-f0-9]+$/);
  });

  it("builds signed BBB urls", () => {
    const url = buildBBBUrl(
      "https://bbb.example.com/bigbluebutton/api/",
      "join",
      { meetingID: "room-1", fullName: "Charles", password: "pw" },
      "secret123"
    );

    expect(url).toContain("https://bbb.example.com/bigbluebutton/api/join?");
    expect(url).toContain("meetingID=room-1");
    expect(url).toContain("fullName=Charles");
    expect(url).toContain("password=pw");
    expect(url).toContain("checksum=");
  });

  it("parses simple xml tag values", () => {
    const xml = `<response><returncode>SUCCESS</returncode><meetingID>abc-123</meetingID></response>`;
    expect(parseXmlValue(xml, "returncode")).toBe("SUCCESS");
    expect(parseXmlValue(xml, "meetingID")).toBe("abc-123");
    expect(parseXmlValue(xml, "missing")).toBe("");
  });
});
