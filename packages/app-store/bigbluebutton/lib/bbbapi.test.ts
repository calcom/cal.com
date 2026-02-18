import { computeChecksum, buildQueryString, buildBBBUrl, parseXmlResponse } from "./bbbapi";

describe("computeChecksum", () => {
  it("produces expected sha256 checksum for a known input", () => {
    // BBB API concatenates: apiName + queryString + sharedSecret, then hashes.
    // sha256("create" + "name=Test&meetingID=abc" + "secret") = known value below.
    // Asserting the exact value (not just format) validates the concatenation order and algorithm.
    const result = computeChecksum("create", "name=Test&meetingID=abc", "secret", "sha256");
    expect(result).toBe("984571596005e70a634ce402a8dc01f86ab963c0be3805c4cc136fe9b45abf1e");
  });

  it("produces expected sha1 checksum for a known input", () => {
    // sha1("getMeetings" + "" + "mysecret") = known value below.
    const result = computeChecksum("getMeetings", "", "mysecret", "sha1");
    expect(result).toBe("5786c1a7a0b03d2f06263fe170693487e742f8dd");
  });

  it("sha256 and sha1 produce different results", () => {
    const sha1 = computeChecksum("create", "meetingID=x", "s", "sha1");
    const sha256 = computeChecksum("create", "meetingID=x", "s", "sha256");
    expect(sha1).not.toBe(sha256);
  });

  it("default algorithm is sha256", () => {
    const explicit = computeChecksum("join", "meetingID=test", "secret", "sha256");
    const defaultAlg = computeChecksum("join", "meetingID=test", "secret");
    expect(explicit).toBe(defaultAlg);
  });
});

describe("buildQueryString", () => {
  it("builds a query string from an object", () => {
    const qs = buildQueryString({ name: "Test Meeting", meetingID: "abc-123" });
    expect(qs).toBe("name=Test%20Meeting&meetingID=abc-123");
  });

  it("omits undefined and null values", () => {
    const qs = buildQueryString({ a: "1", b: undefined, c: "3" });
    expect(qs).toBe("a=1&c=3");
  });

  it("handles boolean and number values", () => {
    const qs = buildQueryString({ record: true, maxParticipants: 10 });
    expect(qs).toBe("record=true&maxParticipants=10");
  });

  it("returns empty string for empty params", () => {
    expect(buildQueryString({})).toBe("");
  });
});

describe("buildBBBUrl", () => {
  const creds = { serverUrl: "https://bbb.example.com/bigbluebutton", sharedSecret: "mysecret" };

  it("includes the checksum parameter", () => {
    const url = buildBBBUrl(creds, "getMeetings", {});
    expect(url).toContain("checksum=");
  });

  it("strips trailing slash from serverUrl", () => {
    const credsWithSlash = { ...creds, serverUrl: "https://bbb.example.com/bigbluebutton/" };
    const url = buildBBBUrl(credsWithSlash, "getMeetings", {});
    expect(url).not.toContain("//api/");
    expect(url).toContain("/api/getMeetings");
  });

  it("includes the provided params in the URL", () => {
    const url = buildBBBUrl(creds, "join", { meetingID: "test-123", password: "pw" });
    expect(url).toContain("meetingID=test-123");
    expect(url).toContain("password=pw");
  });
});

describe("parseXmlResponse", () => {
  it("parses a simple BBB XML response", () => {
    const xml = `
      <response>
        <returncode>SUCCESS</returncode>
        <version>2.0</version>
        <apiVersion>2.0</apiVersion>
      </response>
    `;
    const result = parseXmlResponse(xml);
    expect(result.returncode).toBe("SUCCESS");
    expect(result.version).toBe("2.0");
    expect(result.apiVersion).toBe("2.0");
  });

  it("parses an error response", () => {
    const xml = `
      <response>
        <returncode>FAILED</returncode>
        <messageKey>checksumError</messageKey>
        <message>You did not pass the checksum security check</message>
      </response>
    `;
    const result = parseXmlResponse(xml);
    expect(result.returncode).toBe("FAILED");
    expect(result.messageKey).toBe("checksumError");
  });

  it("parses a create meeting response", () => {
    const xml = `
      <response>
        <returncode>SUCCESS</returncode>
        <meetingID>my-meeting-id</meetingID>
        <attendeePW>attendee-pw</attendeePW>
        <moderatorPW>moderator-pw</moderatorPW>
      </response>
    `;
    const result = parseXmlResponse(xml);
    expect(result.meetingID).toBe("my-meeting-id");
    expect(result.attendeePW).toBe("attendee-pw");
    expect(result.moderatorPW).toBe("moderator-pw");
  });
});
