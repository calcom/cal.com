import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LogoType } from "../logo-hash";
import { getLogoHash, getLogoHashes, getLogoUrl, isValidLogoType } from "../logo-hash";

const LOGO_TYPES: LogoType[] = [
  "logo",
  "icon",
  "favicon-16",
  "favicon-32",
  "apple-touch-icon",
  "mstile",
  "android-chrome-192",
  "android-chrome-256",
];

const MOCK_HASHES: Record<string, string> = {
  logo: "abc12345",
  icon: "def67890",
  "favicon-16": "11112222",
  "favicon-32": "33334444",
  "apple-touch-icon": "55556666",
  mstile: "77778888",
  "android-chrome-192": "99990000",
  "android-chrome-256": "aabbccdd",
};

describe("isValidLogoType", () => {
  it.each(LOGO_TYPES)("returns true for valid type '%s'", (type) => {
    expect(isValidLogoType(type)).toBe(true);
  });

  it("returns false for invalid type", () => {
    expect(isValidLogoType("nonexistent")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidLogoType("")).toBe(false);
  });
});

describe("getLogoHash", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_LOGO_HASHES", JSON.stringify(MOCK_HASHES));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(LOGO_TYPES)("returns the hash from env for '%s'", (type) => {
    expect(getLogoHash(type)).toBe(MOCK_HASHES[type]);
  });

  it("returns empty string when env is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_LOGO_HASHES", "");
    expect(getLogoHash("logo")).toBe("");
  });

  it("returns empty string for invalid JSON in env", () => {
    vi.stubEnv("NEXT_PUBLIC_LOGO_HASHES", "not-json");
    expect(getLogoHash("logo")).toBe("");
  });
});

describe("getLogoHashes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses hashes from env var", () => {
    vi.stubEnv("NEXT_PUBLIC_LOGO_HASHES", JSON.stringify(MOCK_HASHES));
    expect(getLogoHashes()).toEqual(MOCK_HASHES);
  });

  it("returns empty object when env is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_LOGO_HASHES", "");
    expect(getLogoHashes()).toEqual({});
  });
});

describe("getLogoUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_LOGO_HASHES", JSON.stringify(MOCK_HASHES));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes the type and hash in the URL", () => {
    expect(getLogoUrl("favicon-32")).toBe("/api/logo?type=favicon-32&v=33334444");
  });

  it.each(LOGO_TYPES)("returns a URL with v= param for '%s'", (type) => {
    const url = getLogoUrl(type);
    expect(url).toContain(`type=${type}`);
    expect(url).toContain(`&v=${MOCK_HASHES[type]}`);
  });

  it("returns URL without hash when env is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_LOGO_HASHES", "");
    expect(getLogoUrl("logo")).toBe("/api/logo?type=logo");
  });
});
