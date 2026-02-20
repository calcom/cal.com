import { computeChecksum, buildQueryString, buildBBBUrl, parseXmlResponse, validateExternalUrl, assertSafeResolvedIp, validateResolvedAddresses, resolveAndValidateAddresses, buildPinnedUrl, buildHostHeader } from "./bbbapi";

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

  // ── 0.0.0.0/8 — "this network" (unroutable) ─────────────────────────────
  it("rejects 0.0.0.0 (unroutable 'this network' — 0.0.0.0/8)", () => {
    expect(() => assertSafeResolvedIp("0.0.0.0")).toThrow(/Private|internal/i);
  });

  it("rejects 0.255.255.255 (still within 0.0.0.0/8)", () => {
    expect(() => assertSafeResolvedIp("0.255.255.255")).toThrow(/Private|internal/i);
  });

  // ── fe80::/10 — IPv6 link-local ──────────────────────────────────────────
  it("rejects fe80::1 (IPv6 link-local fe80::/10)", () => {
    expect(() => assertSafeResolvedIp("fe80::1")).toThrow(/Private|internal/i);
  });

  it("rejects fe80::dead:beef (IPv6 link-local)", () => {
    expect(() => assertSafeResolvedIp("fe80::dead:beef")).toThrow(/Private|internal/i);
  });

  it("rejects febf::1 (still within fe80::/10 — upper bound)", () => {
    expect(() => assertSafeResolvedIp("febf::1")).toThrow(/Private|internal/i);
  });

  it("does NOT match fec0::1 (outside fe80::/10 — not link-local)", () => {
    // fec0:: is the start of the deprecated Site-Local range (fec0::/10).
    // It is outside the fe80::/10 link-local range tested here.
    // Note: site-local is deprecated by RFC 3879; fec0::/10 is not currently
    // caught by any existing check in assertSafeResolvedIp (it is not ULA).
    // This test documents the current behaviour — a future hardening pass could
    // add a site-local block if desired.
    expect(() => assertSafeResolvedIp("fec0::1")).not.toThrow();
  });
});

// ─── resolveAndValidateAddresses — DNS rebinding + all-records protection ────
// Tests use jest.spyOn on dns.promises.resolve4/resolve6 to simulate DNS
// responses without making real network calls.

describe("resolveAndValidateAddresses", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dns = require("dns");

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("P2 fix — rejects a hostname when ANY resolved address is private (multi-record mix)", async () => {
    // An attacker can return one public IP and one private IP.  Previously,
    // `lookup` returned only one address per family — so only the public IP
    // was checked and the private one slipped through.
    // Now we use `resolve4`/`resolve6` and check ALL records.
    jest.spyOn(dns.promises, "resolve4").mockResolvedValue(["93.184.216.34", "10.0.0.1"]); // public + private mix
    jest.spyOn(dns.promises, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

    await expect(resolveAndValidateAddresses("https://attacker.example.com")).rejects.toThrow(
      /Private|internal/i
    );
  });

  it("P1 fix — rejects a hostname that DNS resolves to a private IPv4", async () => {
    jest.spyOn(dns.promises, "resolve4").mockResolvedValue(["10.0.0.1"]);
    jest.spyOn(dns.promises, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

    await expect(resolveAndValidateAddresses("https://attacker.example.com")).rejects.toThrow(
      /Private|internal/i
    );
  });

  it("P1 fix — rejects a hostname that DNS resolves to 127.0.0.1", async () => {
    jest.spyOn(dns.promises, "resolve4").mockResolvedValue(["127.0.0.1"]);
    jest.spyOn(dns.promises, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

    await expect(resolveAndValidateAddresses("https://evil.test")).rejects.toThrow(
      /Private|internal/i
    );
  });

  it("P1 fix — rejects a hostname that DNS resolves to IPv6 loopback ::1", async () => {
    jest.spyOn(dns.promises, "resolve4").mockRejectedValue(new Error("ENOTFOUND"));
    jest.spyOn(dns.promises, "resolve6").mockResolvedValue(["::1"]);

    await expect(resolveAndValidateAddresses("https://evil6.test")).rejects.toThrow(
      /[Ll]oopback|localhost/
    );
  });

  it("passes and returns the validated IPv4 for a hostname resolving to a public IP", async () => {
    jest.spyOn(dns.promises, "resolve4").mockResolvedValue(["93.184.216.34"]);
    jest.spyOn(dns.promises, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

    const result = await resolveAndValidateAddresses("https://example.com/bbb");
    expect(result).toBe("93.184.216.34");
  });

  it("passes for a literal public IPv4 in the URL (no DNS needed)", async () => {
    // No DNS lookup should happen for a literal IP
    const spy4 = jest.spyOn(dns.promises, "resolve4");
    const spy6 = jest.spyOn(dns.promises, "resolve6");
    const result = await resolveAndValidateAddresses("https://93.184.216.34/bbb");
    expect(result).toBe("93.184.216.34");
    expect(spy4).not.toHaveBeenCalled();
    expect(spy6).not.toHaveBeenCalled();
  });

  it("rejects a literal private IPv4 in the URL (no DNS needed)", async () => {
    await expect(resolveAndValidateAddresses("https://192.168.1.1/bbb")).rejects.toThrow(
      /Private|internal/i
    );
  });

  it("throws when DNS resolution fails for all families", async () => {
    jest.spyOn(dns.promises, "resolve4").mockRejectedValue(new Error("ENOTFOUND"));
    jest.spyOn(dns.promises, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

    await expect(resolveAndValidateAddresses("https://nonexistent.invalid")).rejects.toThrow(
      /DNS resolution failed/i
    );
  });

  it("IPv4 preferred over IPv6 in the returned pinned IP", async () => {
    jest.spyOn(dns.promises, "resolve4").mockResolvedValue(["93.184.216.34"]);
    jest.spyOn(dns.promises, "resolve6").mockResolvedValue(["2606:2800:220:1:248:1893:25c8:1946"]);

    const result = await resolveAndValidateAddresses("https://example.com");
    expect(result).toBe("93.184.216.34"); // IPv4 preferred
  });
});

// ─── validateResolvedAddresses — backwards-compat wrapper ────────────────────

describe("validateResolvedAddresses (compat wrapper)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dns = require("dns");

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("delegates to resolveAndValidateAddresses and resolves void for safe URLs", async () => {
    jest.spyOn(dns.promises, "resolve4").mockResolvedValue(["93.184.216.34"]);
    jest.spyOn(dns.promises, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

    await expect(validateResolvedAddresses("https://example.com/bbb")).resolves.toBeUndefined();
  });

  it("delegates to resolveAndValidateAddresses and rejects for private IPs", async () => {
    jest.spyOn(dns.promises, "resolve4").mockResolvedValue(["10.0.0.1"]);
    jest.spyOn(dns.promises, "resolve6").mockRejectedValue(new Error("ENOTFOUND"));

    await expect(validateResolvedAddresses("https://evil.example.com")).rejects.toThrow(
      /Private|internal/i
    );
  });
});

// ─── buildPinnedUrl — DNS-rebinding-safe URL rewriting ───────────────────────

describe("buildPinnedUrl", () => {
  it("replaces hostname with IPv4 address", () => {
    const pinned = buildPinnedUrl("https://bbb.example.com/api/getMeetings?meetingID=abc", "1.2.3.4");
    expect(pinned).toContain("1.2.3.4");
    expect(pinned).not.toContain("bbb.example.com");
    expect(pinned).toContain("/api/getMeetings");
    expect(pinned).toContain("meetingID=abc");
  });

  it("wraps IPv6 address in brackets", () => {
    const pinned = buildPinnedUrl("https://bbb.example.com/api/create", "2001:db8::1");
    expect(pinned).toContain("[2001:db8::1]");
    expect(pinned).not.toContain("bbb.example.com");
  });

  it("preserves port when original URL has one", () => {
    const pinned = buildPinnedUrl("https://bbb.example.com:8443/api", "1.2.3.4");
    expect(pinned).toContain("1.2.3.4:8443");
  });

  it("preserves path and query string", () => {
    const pinned = buildPinnedUrl(
      "https://bbb.example.com/bigbluebutton/api/join?meetingID=test&password=pw&checksum=abc123",
      "5.6.7.8"
    );
    expect(pinned).toContain("/bigbluebutton/api/join");
    expect(pinned).toContain("meetingID=test");
    expect(pinned).toContain("checksum=abc123");
  });
});

// ─── buildHostHeader — RFC 7230 §5.4 Host header construction ────────────────

describe("buildHostHeader", () => {
  it("returns bare hostname for a plain domain without port", () => {
    expect(buildHostHeader(new URL("https://bbb.example.com/api"))).toBe("bbb.example.com");
  });

  it("appends port for a plain domain with non-default port", () => {
    expect(buildHostHeader(new URL("https://bbb.example.com:8443/api"))).toBe("bbb.example.com:8443");
  });

  it("wraps IPv6 literal in brackets (no port)", () => {
    // URL.hostname for "https://[2001:db8::1]/api" returns "2001:db8::1" (no brackets).
    // The Host header must restore them per RFC 7230 §5.4 / RFC 3986 §3.2.2.
    expect(buildHostHeader(new URL("https://[2001:db8::1]/api"))).toBe("[2001:db8::1]");
  });

  it("wraps IPv6 literal in brackets and appends port", () => {
    expect(buildHostHeader(new URL("https://[2001:db8::1]:8443/api"))).toBe("[2001:db8::1]:8443");
  });

  it("wraps IPv6 loopback ::1 in brackets", () => {
    // This tests the generic bracket-restoration logic regardless of SSRF guards.
    expect(buildHostHeader(new URL("https://[::1]:9090/"))).toBe("[::1]:9090");
  });

  it("returns IPv4 address without brackets (no port)", () => {
    expect(buildHostHeader(new URL("https://1.2.3.4/api"))).toBe("1.2.3.4");
  });

  it("returns IPv4 address with port", () => {
    expect(buildHostHeader(new URL("https://1.2.3.4:8443/api"))).toBe("1.2.3.4:8443");
  });
});
