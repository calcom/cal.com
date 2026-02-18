import { computeChecksum, buildQueryString, buildBBBUrl, parseXmlResponse, validateExternalUrl, assertSafeResolvedIp, validateResolvedAddresses } from "./bbbapi";

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

  it("parses tags with attributes (e.g. <meetings type='array'>)", () => {
    // P2 fix: regex previously failed for tags with attributes because the
    // back-reference \\1 had to match the full opening tag string including attrs.
    const xml = `
      <response>
        <returncode>SUCCESS</returncode>
        <meetings type="array">
          <meeting>test-meeting</meeting>
        </meetings>
        <messageKey type="info">noMeetings</messageKey>
      </response>
    `;
    const result = parseXmlResponse(xml);
    expect(result.returncode).toBe("SUCCESS");
    // Tags with attributes should now be parsed correctly by tag name
    expect(result.messageKey).toBe("noMeetings");
  });

  it("parses nested simple tags within attributed parent (picks up leaf text nodes)", () => {
    const xml = `
      <response type="json">
        <returncode>SUCCESS</returncode>
        <version lang="en">2.0</version>
      </response>
    `;
    const result = parseXmlResponse(xml);
    expect(result.returncode).toBe("SUCCESS");
    expect(result.version).toBe("2.0");
  });
});

describe("validateExternalUrl", () => {
  it("accepts a valid public HTTPS URL", () => {
    expect(() => validateExternalUrl("https://bbb.example.com")).not.toThrow();
  });

  it("rejects HTTP (non-HTTPS) URLs", () => {
    expect(() => validateExternalUrl("http://bbb.example.com")).toThrow(/Only HTTPS/);
  });

  it("rejects localhost", () => {
    expect(() => validateExternalUrl("https://localhost/bbb")).toThrow(/[Ll]oopback|localhost/);
  });

  it("rejects IPv4 loopback (127.x.x.x)", () => {
    expect(() => validateExternalUrl("https://127.0.0.1/bbb")).toThrow(/Private|internal/i);
  });

  it("rejects RFC-1918 private IPv4 10.x.x.x", () => {
    expect(() => validateExternalUrl("https://10.0.0.1/bbb")).toThrow(/Private|internal/i);
  });

  it("rejects RFC-1918 private IPv4 172.16.x.x", () => {
    expect(() => validateExternalUrl("https://172.16.0.1/bbb")).toThrow(/Private|internal/i);
  });

  it("rejects RFC-1918 private IPv4 192.168.x.x", () => {
    expect(() => validateExternalUrl("https://192.168.1.1/bbb")).toThrow(/Private|internal/i);
  });

  it("rejects link-local 169.254.x.x (AWS IMDS)", () => {
    expect(() => validateExternalUrl("https://169.254.169.254/latest/meta-data/")).toThrow(
      /Private|internal|metadata/i
    );
  });

  it("rejects cloud metadata endpoint by hostname", () => {
    expect(() => validateExternalUrl("https://metadata.google.internal/")).toThrow(
      /metadata|not allowed/i
    );
  });

  it("rejects IPv6 loopback ::1", () => {
    expect(() => validateExternalUrl("https://[::1]/bbb")).toThrow(/[Ll]oopback|localhost/);
  });

  it("rejects ULA IPv6 fc00::/7 (fc prefix)", () => {
    expect(() => validateExternalUrl("https://[fc00::1]/bbb")).toThrow(/Private|internal/i);
  });

  it("rejects ULA IPv6 fc00::/7 (fd prefix)", () => {
    expect(() => validateExternalUrl("https://[fd12:3456::1]/bbb")).toThrow(/Private|internal/i);
  });

  it("P2 fix — rejects IPv4-mapped IPv6 ::ffff:127.0.0.1 (dotted-decimal form)", () => {
    // Previously bypassed the check because ::ffff:127.0.0.1 is not matched
    // by the bare IPv4 regex (which checks hostnames, not IPv4-mapped IPv6).
    expect(() => validateExternalUrl("https://[::ffff:127.0.0.1]/bbb")).toThrow(/Private|internal/i);
  });

  it("P2 fix — rejects IPv4-mapped IPv6 ::ffff:10.0.0.1", () => {
    expect(() => validateExternalUrl("https://[::ffff:10.0.0.1]/bbb")).toThrow(/Private|internal/i);
  });

  it("P2 fix — rejects IPv4-mapped IPv6 ::ffff:192.168.1.1", () => {
    expect(() => validateExternalUrl("https://[::ffff:192.168.1.1]/bbb")).toThrow(/Private|internal/i);
  });

  it("P2 fix — rejects IPv4-mapped IPv6 in hex form ::ffff:7f00:1 (127.0.0.1)", () => {
    // ::ffff:7f00:0001 → 0x7f=127, 0x00=0, 0x00=0, 0x01=1 → 127.0.0.1
    expect(() => validateExternalUrl("https://[::ffff:7f00:1]/bbb")).toThrow(/Private|internal/i);
  });

  it("P2 fix — allows public IPv4-mapped IPv6 ::ffff:1.1.1.1 (Cloudflare DNS)", () => {
    // 1.1.1.1 is a public IP — should not be blocked
    expect(() => validateExternalUrl("https://[::ffff:1.1.1.1]/bbb")).not.toThrow();
  });

  it("rejects malformed URL", () => {
    expect(() => validateExternalUrl("not-a-url")).toThrow(/Invalid URL|Only HTTPS/i);
  });
});

// ─── assertSafeResolvedIp ─────────────────────────────────────────────────────
// Unit tests for the extracted IP-range checker used by both the static URL
// validator and the DNS-resolution validator.

describe("assertSafeResolvedIp", () => {
  it("accepts a public IPv4 address", () => {
    expect(() => assertSafeResolvedIp("1.2.3.4")).not.toThrow();
    expect(() => assertSafeResolvedIp("8.8.8.8")).not.toThrow();
  });

  it("rejects IPv4 loopback 127.0.0.1", () => {
    expect(() => assertSafeResolvedIp("127.0.0.1")).toThrow(/Private|internal/i);
  });

  it("rejects IPv4 loopback 127.255.255.255", () => {
    expect(() => assertSafeResolvedIp("127.255.255.255")).toThrow(/Private|internal/i);
  });

  it("rejects RFC-1918 10.x.x.x", () => {
    expect(() => assertSafeResolvedIp("10.0.0.1")).toThrow(/Private|internal/i);
  });

  it("rejects RFC-1918 172.16.x.x", () => {
    expect(() => assertSafeResolvedIp("172.16.0.1")).toThrow(/Private|internal/i);
  });

  it("rejects RFC-1918 172.31.x.x", () => {
    expect(() => assertSafeResolvedIp("172.31.255.255")).toThrow(/Private|internal/i);
  });

  it("allows 172.32.x.x (just outside RFC-1918 range)", () => {
    expect(() => assertSafeResolvedIp("172.32.0.1")).not.toThrow();
  });

  it("rejects RFC-1918 192.168.x.x", () => {
    expect(() => assertSafeResolvedIp("192.168.1.1")).toThrow(/Private|internal/i);
  });

  it("rejects link-local 169.254.x.x (AWS IMDS)", () => {
    expect(() => assertSafeResolvedIp("169.254.169.254")).toThrow(/Private|internal/i);
  });

  it("rejects IPv6 loopback ::1", () => {
    expect(() => assertSafeResolvedIp("::1")).toThrow(/[Ll]oopback|localhost/);
  });

  it("rejects IPv6 ULA fc00::/7 (fc prefix)", () => {
    expect(() => assertSafeResolvedIp("fc00::1")).toThrow(/Private|internal/i);
  });

  it("rejects IPv6 ULA fc00::/7 (fd prefix)", () => {
    expect(() => assertSafeResolvedIp("fd12:3456::1")).toThrow(/Private|internal/i);
  });

  it("rejects IPv4-mapped ::ffff:127.0.0.1", () => {
    expect(() => assertSafeResolvedIp("::ffff:127.0.0.1")).toThrow(/Private|internal/i);
  });

  it("rejects IPv4-mapped ::ffff:10.0.0.1", () => {
    expect(() => assertSafeResolvedIp("::ffff:10.0.0.1")).toThrow(/Private|internal/i);
  });

  it("rejects IPv4-mapped hex form ::ffff:7f00:1 (127.0.0.1)", () => {
    expect(() => assertSafeResolvedIp("::ffff:7f00:1")).toThrow(/Private|internal/i);
  });

  it("allows public IPv4-mapped ::ffff:1.1.1.1", () => {
    expect(() => assertSafeResolvedIp("::ffff:1.1.1.1")).not.toThrow();
  });

  it("accepts a public IPv6 address", () => {
    expect(() => assertSafeResolvedIp("2001:4860:4860::8888")).not.toThrow();
  });
});

// ─── validateResolvedAddresses — DNS rebinding protection ────────────────────
// Tests use jest.spyOn on dns.promises.lookup to simulate DNS responses
// without making real network calls.

describe("validateResolvedAddresses", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dns = require("dns");

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("P1 fix — rejects a hostname that DNS resolves to a private IPv4 (DNS rebinding scenario)", async () => {
    // Simulate a domain that resolves to 10.0.0.1 (RFC-1918).
    // validateExternalUrl("https://attacker.example.com") would pass (not a literal IP),
    // but validateResolvedAddresses catches it at DNS-resolution time.
    jest.spyOn(dns.promises, "lookup").mockImplementation((_host: string, opts: { family: number }) => {
      if (opts.family === 4) return Promise.resolve({ address: "10.0.0.1", family: 4 });
      return Promise.reject(new Error("ENOTFOUND"));
    });

    await expect(validateResolvedAddresses("https://attacker.example.com")).rejects.toThrow(
      /Private|internal/i
    );
  });

  it("P1 fix — rejects a hostname that DNS resolves to 127.0.0.1 (localhost rebinding)", async () => {
    jest.spyOn(dns.promises, "lookup").mockImplementation((_host: string, opts: { family: number }) => {
      if (opts.family === 4) return Promise.resolve({ address: "127.0.0.1", family: 4 });
      return Promise.reject(new Error("ENOTFOUND"));
    });

    await expect(validateResolvedAddresses("https://evil.test")).rejects.toThrow(
      /Private|internal/i
    );
  });

  it("P1 fix — rejects a hostname that DNS resolves to IPv6 loopback ::1", async () => {
    jest.spyOn(dns.promises, "lookup").mockImplementation((_host: string, opts: { family: number }) => {
      if (opts.family === 6) return Promise.resolve({ address: "::1", family: 6 });
      return Promise.reject(new Error("ENOTFOUND"));
    });

    await expect(validateResolvedAddresses("https://evil6.test")).rejects.toThrow(
      /[Ll]oopback|localhost/
    );
  });

  it("passes for a hostname that DNS resolves to a public IPv4", async () => {
    jest.spyOn(dns.promises, "lookup").mockImplementation((_host: string, opts: { family: number }) => {
      if (opts.family === 4) return Promise.resolve({ address: "93.184.216.34", family: 4 });
      return Promise.reject(new Error("ENOTFOUND"));
    });

    await expect(validateResolvedAddresses("https://example.com/bbb")).resolves.toBeUndefined();
  });

  it("passes for a literal public IPv4 in the URL (no DNS needed)", async () => {
    // No DNS lookup should happen for a literal IP
    const spy = jest.spyOn(dns.promises, "lookup");
    await expect(validateResolvedAddresses("https://93.184.216.34/bbb")).resolves.toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a literal private IPv4 in the URL (no DNS needed)", async () => {
    await expect(validateResolvedAddresses("https://192.168.1.1/bbb")).rejects.toThrow(
      /Private|internal/i
    );
  });

  it("throws when DNS lookup fails for all address families", async () => {
    jest.spyOn(dns.promises, "lookup").mockRejectedValue(new Error("ENOTFOUND"));

    await expect(validateResolvedAddresses("https://nonexistent.invalid")).rejects.toThrow(
      /DNS resolution failed/i
    );
  });
});
