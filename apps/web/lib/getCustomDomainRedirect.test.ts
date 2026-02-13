import { describe, it, expect, vi, beforeEach } from "vitest";

import { buildCustomDomainRedirect } from "./getCustomDomainRedirect";

vi.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: (slug: string, options?: { isCustomDomain?: boolean }) => {
    return `https://${slug}`;
  },
}));

describe("buildCustomDomainRedirect", () => {
  it("returns null when already on a custom domain", () => {
    const result = buildCustomDomainRedirect({
      customDomainFromRequest: "meet.acme.com",
      verifiedCustomDomain: "meet.acme.com",
      path: "/john/30min",
    });
    expect(result).toBeNull();
  });

  it("returns null when verifiedCustomDomain is null", () => {
    const result = buildCustomDomainRedirect({
      customDomainFromRequest: null,
      verifiedCustomDomain: null,
      path: "/john/30min",
    });
    expect(result).toBeNull();
  });

  it("returns null when verifiedCustomDomain is undefined", () => {
    const result = buildCustomDomainRedirect({
      customDomainFromRequest: null,
      verifiedCustomDomain: undefined,
      path: "/john/30min",
    });
    expect(result).toBeNull();
  });

  it("returns 301 redirect with correct destination", () => {
    const result = buildCustomDomainRedirect({
      customDomainFromRequest: null,
      verifiedCustomDomain: "meet.acme.com",
      path: "/john/30min",
    });
    expect(result).toEqual({
      redirect: {
        permanent: true,
        destination: "https://meet.acme.com/john/30min",
      },
    });
  });

  it("preserves query string in redirect", () => {
    const result = buildCustomDomainRedirect({
      customDomainFromRequest: null,
      verifiedCustomDomain: "meet.acme.com",
      path: "/john/30min",
      search: "?rescheduleUid=abc&date=2024-01-01",
    });
    expect(result).toEqual({
      redirect: {
        permanent: true,
        destination: "https://meet.acme.com/john/30min?rescheduleUid=abc&date=2024-01-01",
      },
    });
  });

  it("handles root path redirect", () => {
    const result = buildCustomDomainRedirect({
      customDomainFromRequest: null,
      verifiedCustomDomain: "booking.company.com",
      path: "/",
    });
    expect(result).toEqual({
      redirect: {
        permanent: true,
        destination: "https://booking.company.com/",
      },
    });
  });

  it("handles empty search string", () => {
    const result = buildCustomDomainRedirect({
      customDomainFromRequest: null,
      verifiedCustomDomain: "meet.acme.com",
      path: "/team/engineering/standup",
      search: "",
    });
    expect(result).toEqual({
      redirect: {
        permanent: true,
        destination: "https://meet.acme.com/team/engineering/standup",
      },
    });
  });
});
