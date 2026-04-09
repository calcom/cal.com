import { describe, it, expect, vi } from "vitest";

const MOCKED_WEBAPP_URL = "https://test.example.com";

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://test.example.com",
}));

import { normalizeCallbackUrl } from "./normalize-callback-url";

describe("normalizeCallbackUrl", () => {
  it("returns WEBAPP_URL with trailing slash for empty input", () => {
    expect(normalizeCallbackUrl("")).toBe(`${MOCKED_WEBAPP_URL}/`);
  });

  it("returns absolute URL unchanged", () => {
    expect(normalizeCallbackUrl("https://other.example.com/teams")).toBe("https://other.example.com/teams");
  });

  it("returns http absolute URL unchanged", () => {
    expect(normalizeCallbackUrl("http://localhost:3000/teams")).toBe("http://localhost:3000/teams");
  });

  it("converts relative path with leading slash to absolute URL without double-slash", () => {
    expect(normalizeCallbackUrl("/teams")).toBe(`${MOCKED_WEBAPP_URL}/teams`);
  });

  it("converts relative path without leading slash to absolute URL", () => {
    expect(normalizeCallbackUrl("teams")).toBe(`${MOCKED_WEBAPP_URL}/teams`);
  });

  it("preserves query parameters in relative path", () => {
    expect(normalizeCallbackUrl("/teams?token=abc&foo=bar")).toBe(`${MOCKED_WEBAPP_URL}/teams?token=abc&foo=bar`);
  });

  it("preserves query parameters in path without leading slash", () => {
    expect(normalizeCallbackUrl("settings/general?tab=profile")).toBe(
      `${MOCKED_WEBAPP_URL}/settings/general?tab=profile`
    );
  });

  it("handles nested paths correctly", () => {
    expect(normalizeCallbackUrl("/settings/my-account/general")).toBe(
      `${MOCKED_WEBAPP_URL}/settings/my-account/general`
    );
  });
});
