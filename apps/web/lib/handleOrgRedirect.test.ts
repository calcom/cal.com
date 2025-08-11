import type { GetServerSidePropsContext } from "next";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import * as constants from "@calcom/lib/constants";
import { RedirectType } from "@calcom/prisma/client";

import { handleOrgRedirect } from "./handleOrgRedirect";

// Mock prisma for all tests
const prismaMock = vi.hoisted(() => ({
  tempOrgRedirect: {
    findMany: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));

describe("handleOrgRedirect", () => {
  const mockContext = {
    req: {
      headers: {
        host: "cal.local:3000",
      },
    },
    query: {},
    resolvedUrl: "/pro",
  } as unknown as GetServerSidePropsContext;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tempOrgRedirect.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Non-org context redirects", () => {
    it("should check for redirects when not in org context", async () => {
      prismaMock.tempOrgRedirect.findMany.mockResolvedValue([
        {
          toUrl: "https://acme.cal.local:3000/pro-example",
          from: "pro",
          type: RedirectType.User,
        },
      ]);

      const result = await handleOrgRedirect({
        slugs: ["pro"],
        redirectType: RedirectType.User,
        eventTypeSlug: null,
        context: mockContext,
        currentOrgDomain: null,
      });

      expect(prismaMock.tempOrgRedirect.findMany).toHaveBeenCalledWith({
        where: {
          type: RedirectType.User,
          from: {
            in: ["pro"],
          },
          fromOrgId: 0,
        },
      });
      expect(result).toEqual({
        redirect: {
          permanent: false,
          destination: "https://acme.cal.local:3000/pro-example?orgRedirection=true",
        },
      });
    });

    it("should return null when no redirect is found in non-org context", async () => {
      prismaMock.tempOrgRedirect.findMany.mockResolvedValue([]);

      const result = await handleOrgRedirect({
        slugs: ["pro"],
        redirectType: RedirectType.User,
        eventTypeSlug: null,
        context: mockContext,
        currentOrgDomain: null,
      });

      expect(result).toBeNull();
    });
  });

  describe("SINGLE_ORG_SLUG mode redirects", () => {
    it("should check for redirects in SINGLE_ORG_SLUG mode when not on actual org domain", async () => {
      vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue("acme");

      prismaMock.tempOrgRedirect.findMany.mockResolvedValue([
        {
          toUrl: "https://acme.cal.local:3000/pro-example",
          from: "pro",
          type: RedirectType.User,
        },
      ]);

      const result = await handleOrgRedirect({
        slugs: ["pro"],
        redirectType: RedirectType.User,
        eventTypeSlug: null,
        context: mockContext,
        currentOrgDomain: "acme",
      });

      expect(prismaMock.tempOrgRedirect.findMany).toHaveBeenCalledWith({
        where: {
          type: RedirectType.User,
          from: {
            in: ["pro"],
          },
          fromOrgId: 0,
        },
      });
      expect(result).toEqual({
        redirect: {
          permanent: false,
          destination: "https://acme.cal.local:3000/pro-example?orgRedirection=true",
        },
      });
    });

    it("should not redirect when already on org subdomain", async () => {
      vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue("acme");

      const contextWithOrgDomain = {
        ...mockContext,
        req: {
          headers: {
            host: "acme.cal.local:3000",
          },
        },
      } as unknown as GetServerSidePropsContext;

      const result = await handleOrgRedirect({
        slugs: ["pro"],
        redirectType: RedirectType.User,
        eventTypeSlug: null,
        context: contextWithOrgDomain,
        currentOrgDomain: "acme",
      });

      expect(prismaMock.tempOrgRedirect.findMany).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should prevent infinite redirects", async () => {
      vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue("acme");

      prismaMock.tempOrgRedirect.findMany.mockResolvedValue([
        {
          toUrl: "https://cal.local:3000/pro",
          from: "pro",
          type: RedirectType.User,
        },
      ]);

      const result = await handleOrgRedirect({
        slugs: ["pro"],
        redirectType: RedirectType.User,
        eventTypeSlug: null,
        context: mockContext,
        currentOrgDomain: "acme",
      });

      // Should not redirect since target path is same as current path
      expect(result).toBeNull();
    });

    it("should not redirect when orgRedirection query param is true", async () => {
      vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue("acme");

      const mockContextWithOrgRedirection = {
        ...mockContext,
        query: { orgRedirection: "true" },
      } as unknown as GetServerSidePropsContext;

      const result = await handleOrgRedirect({
        slugs: ["pro"],
        redirectType: RedirectType.User,
        eventTypeSlug: null,
        context: mockContextWithOrgRedirection,
        currentOrgDomain: "acme",
      });

      expect(prismaMock.tempOrgRedirect.findMany).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("with event type slug", () => {
    it("should include event type slug in redirect check", async () => {
      prismaMock.tempOrgRedirect.findMany.mockResolvedValue([
        {
          toUrl: "https://acme.cal.local:3000/pro-example",
          from: "pro",
          type: RedirectType.User,
        },
      ]);

      const result = await handleOrgRedirect({
        slugs: ["pro"],
        redirectType: RedirectType.User,
        eventTypeSlug: "30min",
        context: mockContext,
        currentOrgDomain: null,
      });

      expect(prismaMock.tempOrgRedirect.findMany).toHaveBeenCalledWith({
        where: {
          type: RedirectType.User,
          from: {
            in: ["pro"],
          },
          fromOrgId: 0,
        },
      });
      expect(result).toEqual({
        redirect: {
          permanent: false,
          destination: "https://acme.cal.local:3000/pro-example/30min?orgRedirection=true",
        },
      });
    });
  });
});

// Additional tests for query parameter handling
describe("handleOrgRedirect - query parameter handling", () => {
  const mockContext = {
    req: {
      headers: {
        host: "cal.local:3000",
      },
    },
    query: {},
    resolvedUrl: "/pro",
  } as unknown as GetServerSidePropsContext;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tempOrgRedirect.findMany.mockResolvedValue([]);
  });

  it("should add orgRedirection=true to redirect URL", async () => {
    prismaMock.tempOrgRedirect.findMany.mockResolvedValue([
      {
        toUrl: "https://calcom.cal.com/slug",
        from: "slug",
        type: RedirectType.User,
      },
    ]);

    const redirect = await handleOrgRedirect({
      slugs: ["slug"],
      redirectType: RedirectType.User,
      eventTypeSlug: "30min",
      context: mockContext,
      currentOrgDomain: null,
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/slug/30min?orgRedirection=true",
      },
    });
  });

  it("should preserve existing query params when redirecting", async () => {
    const contextWithQuery = {
      ...mockContext,
      query: { abc: "1" },
    } as unknown as GetServerSidePropsContext;

    prismaMock.tempOrgRedirect.findMany.mockResolvedValue([
      {
        toUrl: "https://calcom.cal.com/slug",
        from: "slug",
        type: RedirectType.User,
      },
    ]);

    const redirect = await handleOrgRedirect({
      slugs: ["slug"],
      redirectType: RedirectType.User,
      eventTypeSlug: "30min",
      context: contextWithQuery,
      currentOrgDomain: null,
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/slug/30min?abc=1&orgRedirection=true",
      },
    });
  });

  it("should not duplicate orgRedirection parameter if already present", async () => {
    const contextWithOrgRedirection = {
      ...mockContext,
      query: { orgRedirection: "true", abc: "1" },
    } as unknown as GetServerSidePropsContext;

    prismaMock.tempOrgRedirect.findMany.mockResolvedValue([
      {
        toUrl: "https://calcom.cal.com/slug",
        from: "slug",
        type: RedirectType.User,
      },
    ]);

    const redirect = await handleOrgRedirect({
      slugs: ["slug"],
      redirectType: RedirectType.User,
      eventTypeSlug: "30min",
      context: contextWithOrgRedirection,
      currentOrgDomain: null,
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/slug/30min?orgRedirection=true&abc=1",
      },
    });

    // Ensure there's only one orgRedirection parameter
    const url = new URL(redirect!.redirect.destination);
    const orgRedirectionParams = url.searchParams.getAll("orgRedirection");
    expect(orgRedirectionParams).toHaveLength(1);
    expect(orgRedirectionParams[0]).toBe("true");
  });
});
