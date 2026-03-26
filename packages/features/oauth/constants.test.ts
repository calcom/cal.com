import { describe, expect, it } from "vitest";
import { ALL_KNOWN_SCOPES, isLegacyClient, isLegacyScope, OAUTH_SCOPES, parseScopeParam } from "./constants";

describe("parseScopeParam", () => {
  it("returns empty array for null", () => {
    expect(parseScopeParam(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseScopeParam(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseScopeParam("")).toEqual([]);
  });

  it("splits space-separated scopes", () => {
    expect(parseScopeParam("BOOKING_READ BOOKING_WRITE")).toEqual(["BOOKING_READ", "BOOKING_WRITE"]);
  });

  it("splits comma-separated scopes", () => {
    expect(parseScopeParam("BOOKING_READ,BOOKING_WRITE")).toEqual(["BOOKING_READ", "BOOKING_WRITE"]);
  });

  it("splits mixed delimiters", () => {
    expect(parseScopeParam("BOOKING_READ, BOOKING_WRITE SCHEDULE_READ")).toEqual([
      "BOOKING_READ",
      "BOOKING_WRITE",
      "SCHEDULE_READ",
    ]);
  });

  it("filters out empty entries from consecutive delimiters", () => {
    expect(parseScopeParam("BOOKING_READ,,BOOKING_WRITE")).toEqual(["BOOKING_READ", "BOOKING_WRITE"]);
    expect(parseScopeParam("BOOKING_READ  BOOKING_WRITE")).toEqual(["BOOKING_READ", "BOOKING_WRITE"]);
  });

  it("handles single scope", () => {
    expect(parseScopeParam("BOOKING_READ")).toEqual(["BOOKING_READ"]);
  });
});

describe("isLegacyScope", () => {
  it("returns true for READ_BOOKING", () => {
    expect(isLegacyScope("READ_BOOKING")).toBe(true);
  });

  it("returns true for READ_PROFILE", () => {
    expect(isLegacyScope("READ_PROFILE")).toBe(true);
  });

  it("returns false for new scopes", () => {
    expect(isLegacyScope("BOOKING_READ")).toBe(false);
    expect(isLegacyScope("PROFILE_READ")).toBe(false);
    expect(isLegacyScope("EVENT_TYPE_WRITE")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isLegacyScope("")).toBe(false);
  });
});

describe("isLegacyClient", () => {
  it("returns true for null scopes", () => {
    expect(isLegacyClient(null)).toBe(true);
  });

  it("returns true for undefined scopes", () => {
    expect(isLegacyClient(undefined)).toBe(true);
  });

  it("returns true for empty array", () => {
    expect(isLegacyClient([])).toBe(true);
  });

  it("returns true when all scopes are legacy", () => {
    expect(isLegacyClient(["READ_BOOKING", "READ_PROFILE"])).toBe(true);
    expect(isLegacyClient(["READ_BOOKING"])).toBe(true);
  });

  it("returns false when any scope is non-legacy", () => {
    expect(isLegacyClient(["READ_BOOKING", "BOOKING_READ"])).toBe(false);
    expect(isLegacyClient(["BOOKING_READ", "BOOKING_WRITE"])).toBe(false);
  });

  it("returns false for only new scopes", () => {
    expect(isLegacyClient(["EVENT_TYPE_READ", "SCHEDULE_WRITE"])).toBe(false);
  });
});

describe("OAUTH_SCOPES", () => {
  it("contains all individual, team, and org scopes", () => {
    expect(OAUTH_SCOPES.length).toBe(30); // 10 individual + 10 team + 10 org
  });

  it("does not contain legacy scopes", () => {
    expect(OAUTH_SCOPES).not.toContain("READ_BOOKING");
    expect(OAUTH_SCOPES).not.toContain("READ_PROFILE");
  });
});

describe("ALL_KNOWN_SCOPES", () => {
  it("includes both new and legacy scopes", () => {
    expect(ALL_KNOWN_SCOPES).toContain("READ_BOOKING");
    expect(ALL_KNOWN_SCOPES).toContain("READ_PROFILE");
    expect(ALL_KNOWN_SCOPES).toContain("BOOKING_READ");
    expect(ALL_KNOWN_SCOPES).toContain("EVENT_TYPE_WRITE");
  });

  it("has 32 total scopes (30 new + 2 legacy)", () => {
    expect(ALL_KNOWN_SCOPES.length).toBe(32);
  });
});
