import { describe, expect, test } from "bun:test";
import { getAvatarUrl } from "../../utils/getAvatarUrl";

describe("getAvatarUrl", () => {
  const CAL_URL = "https://cal.com";
  const AVATAR_FALLBACK = "/avatar.png";

  test("returns fallback URL for null input", () => {
    expect(getAvatarUrl(null)).toBe(CAL_URL + AVATAR_FALLBACK);
  });

  test("returns fallback URL for undefined input", () => {
    expect(getAvatarUrl(undefined)).toBe(CAL_URL + AVATAR_FALLBACK);
  });

  test("returns fallback URL for empty string", () => {
    expect(getAvatarUrl("")).toBe(CAL_URL + AVATAR_FALLBACK);
  });

  test("returns absolute HTTPS URL as-is", () => {
    const url = "https://example.com/avatar.jpg";
    expect(getAvatarUrl(url)).toBe(url);
  });

  test("returns absolute HTTP URL as-is", () => {
    const url = "http://example.com/avatar.jpg";
    expect(getAvatarUrl(url)).toBe(url);
  });

  test("returns base64 data URL as-is", () => {
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    expect(getAvatarUrl(dataUrl)).toBe(dataUrl);
  });

  test("prefixes relative URL with CAL_URL", () => {
    expect(getAvatarUrl("/api/avatar/123")).toBe(`${CAL_URL}/api/avatar/123`);
  });

  test("adds leading slash to relative URL without one", () => {
    expect(getAvatarUrl("api/avatar/123")).toBe(`${CAL_URL}/api/avatar/123`);
  });
});
