import { describe, expect, it, vi, beforeEach } from "vitest";

import { getOrgSlug } from "../orgDomains";

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
  ALLOWED_HOSTNAMES: ["https://app.cal.com", "cal.com"],
  RESERVED_SUBDOMAINS: ["www", "app", "api"],
  SINGLE_ORG_SLUG: undefined,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

describe("orgDomains hostname validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle WEBAPP_URL with protocol and ALLOWED_HOSTNAMES with protocol", () => {
    const result = getOrgSlug("team.app.cal.com");
    expect(result).not.toBe(null);
  });

  it("should handle WEBAPP_URL with protocol and ALLOWED_HOSTNAMES without protocol", () => {
    const result = getOrgSlug("team.app.cal.com");
    expect(result).not.toBe(null);
  });

  it("should handle hostname mismatch scenario from bug report", () => {
    const result = getOrgSlug("myorg.cal.com");
    expect(result).toBe("myorg");
  });
});
