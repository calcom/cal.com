import type { ParsedUrlQuery } from "node:querystring";
import * as constants from "@calcom/lib/constants";
import { RedirectType } from "@calcom/prisma/enums";
import type { GetServerSidePropsContext } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRedirectWithOriginAndSearchString, handleOrgRedirect } from "./handleOrgRedirect";

// Mock prisma for all tests
const prismaMock = vi.hoisted(() => ({
  tempOrgRedirect: {
    findMany: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));

const createTestContext = (overrides?: {
  host?: string;
  query?: ParsedUrlQuery;
}): GetServerSidePropsContext =>
  ({
    req: {
      headers: {
        host: overrides?.host || "cal.local:3000",
      },
    },
    query: overrides?.query || {},
  }) as unknown as GetServerSidePropsContext;

const createTestRedirectParams = (overrides?: {
  slugs?: string[];
  redirectType?: RedirectType;
  eventTypeSlug?: string | null;
  context?: GetServerSidePropsContext;
  currentOrgDomain?: string | null;
}) => ({
  slugs: overrides?.slugs || ["pro"],
  redirectType: overrides?.redirectType || RedirectType.User,
  eventTypeSlug: overrides?.eventTypeSlug ?? null,
  context: overrides?.context || createTestContext(),
  currentOrgDomain: overrides?.currentOrgDomain ?? null,
});

interface RedirectScenario {
  redirects: Array<{
    from: string;
    toUrl: string;
    type?: RedirectType;
  }>;
}

const createRedirectScenario = (scenario: RedirectScenario) => {
  // Create a map for quick lookup based on input parameters
  const redirectMap = new Map<string, (typeof scenario.redirects)[0]>();

  scenario.redirects.forEach((redirect) => {
    const key = `${redirect.type || RedirectType.User}-${redirect.from}`;
    redirectMap.set(key, redirect);
  });

  // Return a mock implementation that returns data based on the actual query
  prismaMock.tempOrgRedirect.findMany.mockImplementation(async (params) => {
    const { type, from } = params?.where || {};
    const slugsToFind = from?.in || [];

    // Return redirects that match the requested type and slugs
    const matchingRedirects = slugsToFind
      .map((slug: string) => {
        const key = `${type}-${slug}`;
        const redirect = redirectMap.get(key);
        if (redirect) {
          return {
            from: redirect.from,
            toUrl: redirect.toUrl,
            type: redirect.type || type,
            fromOrgId: 0,
          };
        }
        return null;
      })
      .filter(Boolean);

    return matchingRedirects;
  });
};

const expectRedirectTo = (result: any, expectedDestination: string) => {
  expect(result).toEqual({
    redirect: {
      permanent: false,
      destination: expectedDestination,
    },
  });
};

const expectNoRedirect = (result: any) => {
  expect(result).toBeNull();
};

const expectPrismaCalledWith = (expectedParams: { type: RedirectType; slugs: string[] }) => {
  expect(prismaMock.tempOrgRedirect.findMany).toHaveBeenCalledWith({
    where: {
      type: expectedParams.type,
      from: {
        in: expectedParams.slugs,
      },
      fromOrgId: 0,
    },
  });
};

const expectPrismaNotCalled = () => {
  expect(prismaMock.tempOrgRedirect.findMany).not.toHaveBeenCalled();
};

// Verify that the redirect was actually built from the data returned by Prisma
const expectRedirectUsesData = (
  result: any,
  expectedSlug: string,
  expectedOrigin = "https://acme.cal.local:3000"
) => {
  if (!result || !result.redirect) {
    throw new Error("Expected a redirect result but got null/undefined");
  }
  const url = new URL(result.redirect.destination);
  expect(url.origin).toBe(expectedOrigin);
  expect(url.pathname).toContain(expectedSlug);
};

describe("handleOrgRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to no redirects - tests will override with specific scenarios
    createRedirectScenario({ redirects: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when not in organization context", () => {
    it("should redirect to organization URL when redirect exists", async () => {
      // Setup scenario with unique test data to verify correct usage
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
          // Add a decoy redirect to ensure the code picks the right one
          {
            from: "other-user",
            toUrl: "https://acme.cal.local:3000/wrong-redirect",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        slugs: ["pro"],
      });
      const result = await handleOrgRedirect(params);

      expectPrismaCalledWith({ type: RedirectType.User, slugs: ["pro"] });
      expectRedirectTo(result, "https://acme.cal.local:3000/pro-example?orgRedirection=true");
      expectRedirectUsesData(result, "pro-example");
    });

    it("should return null when no redirect exists", async () => {
      // Explicitly set up no redirects scenario
      createRedirectScenario({ redirects: [] });

      const params = createTestRedirectParams({
        slugs: ["pro"],
      });
      const result = await handleOrgRedirect(params);

      expectPrismaCalledWith({ type: RedirectType.User, slugs: ["pro"] });
      expectNoRedirect(result);
    });

    it("should handle Team redirect type", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "sales-team",
            toUrl: "https://acme.cal.local:3000/sales",
            type: RedirectType.Team,
          },
          // Add a User redirect with same slug to verify type filtering
          {
            from: "sales-team",
            toUrl: "https://acme.cal.local:3000/wrong-user-redirect",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        slugs: ["sales-team"],
        redirectType: RedirectType.Team,
      });
      const result = await handleOrgRedirect(params);

      expectPrismaCalledWith({ type: RedirectType.Team, slugs: ["sales-team"] });
      expectRedirectTo(result, "https://acme.cal.local:3000/sales?orgRedirection=true");
      expectRedirectUsesData(result, "sales");
    });
  });

  describe("when SINGLE_ORG_SLUG mode is enabled", () => {
    beforeEach(() => {
      vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue("acme");
    });

    it("should redirect using relative path when accessing from base domain", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        context: createTestContext({ host: "cal.local:3000" }),
        currentOrgDomain: "acme",
      });
      const result = await handleOrgRedirect(params);

      expectPrismaCalledWith({ type: RedirectType.User, slugs: ["pro"] });
      // Should use relative path to stay on same domain
      expectRedirectTo(result, "/pro-example?orgRedirection=true");
    });

    it("should redirect john87 to john using relative path in single org mode", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "john87",
            toUrl: "https://acme.cal.local:3000/john",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        slugs: ["john87"],
        context: createTestContext({
          host: "my-instance.com",
        }),
        currentOrgDomain: "acme",
      });
      const result = await handleOrgRedirect(params);

      expectPrismaCalledWith({ type: RedirectType.User, slugs: ["john87"] });
      // Should redirect to relative path /john to stay on my-instance.com
      expectRedirectTo(result, "/john?orgRedirection=true");
    });

    describe("when orgRedirection parameter is present", () => {
      it("should not redirect to prevent loops", async () => {
        const params = createTestRedirectParams({
          context: createTestContext({ query: { orgRedirection: "true" } }),
          currentOrgDomain: "acme",
        });
        const result = await handleOrgRedirect(params);

        expectPrismaNotCalled();
        expectNoRedirect(result);
      });
    });
  });

  describe("when event type slug is provided", () => {
    it("should include event type slug in redirect destination", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        eventTypeSlug: "30min",
      });
      const result = await handleOrgRedirect(params);

      expectPrismaCalledWith({ type: RedirectType.User, slugs: ["pro"] });
      expectRedirectTo(result, "https://acme.cal.local:3000/pro-example/30min?orgRedirection=true");
      // Verify the event type slug was properly appended
      const url = new URL(result?.redirect.destination || "");
      expect(url.pathname).toBe("/pro-example/30min");
    });

    it("should handle empty event type slug", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        eventTypeSlug: null,
      });
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000/pro-example?orgRedirection=true");
      expectRedirectUsesData(result, "pro-example");
    });
  });

  describe("when handling multiple slugs (group bookings)", () => {
    it("should preserve order of slugs in redirect", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "user1",
            toUrl: "https://acme.cal.local:3000/org-user1",
            type: RedirectType.User,
          },
          {
            from: "user2",
            toUrl: "https://acme.cal.local:3000/org-user2",
            type: RedirectType.User,
          },
          {
            from: "user3",
            toUrl: "https://acme.cal.local:3000/org-user3",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        slugs: ["user1", "user2", "user3"],
      });
      const result = await handleOrgRedirect(params);

      expectRedirectTo(
        result,
        "https://acme.cal.local:3000/org-user1+org-user2+org-user3?orgRedirection=true"
      );
      // Verify order is preserved from input slugs
      const url = new URL(result?.redirect.destination || "");
      expect(url.pathname).toBe("/org-user1+org-user2+org-user3");
    });

    it("should handle partial redirects in group bookings", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "user1",
            toUrl: "https://acme.cal.local:3000/org-user1",
            type: RedirectType.User,
          },
          // user2 has no redirect - it should stay as-is
          {
            from: "user3",
            toUrl: "https://acme.cal.local:3000/org-user3",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        slugs: ["user1", "user2", "user3"],
      });
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000/org-user1+user2+org-user3?orgRedirection=true");
      // Verify that user2 remains unchanged while others are redirected
      const url = new URL(result?.redirect.destination || "");
      expect(url.pathname).toBe("/org-user1+user2+org-user3");
    });

    it("should handle different origins in redirects", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "user1",
            toUrl: "https://org1.cal.com/john",
            type: RedirectType.User,
          },
          {
            from: "user2",
            toUrl: "https://org1.cal.com/jane",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        slugs: ["user1", "user2"],
      });
      const result = await handleOrgRedirect(params);

      // Should use the first redirect's origin
      expectRedirectTo(result, "https://org1.cal.com/john+jane?orgRedirection=true");
      expectRedirectUsesData(result, "john+jane", "https://org1.cal.com");
    });
  });

  describe("when handling query parameters", () => {
    it("should add orgRedirection=true to empty query", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        context: createTestContext({ query: {} }),
      });
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000/pro-example?orgRedirection=true");
      expectRedirectUsesData(result, "pro-example");
    });

    it("should preserve existing query parameters", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        context: createTestContext({
          query: { abc: "1", xyz: "test" },
        }),
      });
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000/pro-example?abc=1&xyz=test&orgRedirection=true");
      // Verify query parameters are preserved
      const url = new URL(result?.redirect.destination || "");
      expect(url.searchParams.get("abc")).toBe("1");
      expect(url.searchParams.get("xyz")).toBe("test");
    });

    it("should not duplicate orgRedirection parameter", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        context: createTestContext({
          query: { orgRedirection: "true", abc: "1" },
        }),
      });
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000/pro-example?abc=1&orgRedirection=true");

      // Verify only one orgRedirection parameter exists
      const url = new URL(result?.redirect.destination || "");
      const orgRedirectionParams = url.searchParams.getAll("orgRedirection");
      expect(orgRedirectionParams).toHaveLength(1);
      expect(orgRedirectionParams[0]).toBe("true");
    });

    it("should handle array query parameters", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        context: createTestContext({
          query: { tags: ["tag1", "tag2"], filter: "active" },
        }),
      });
      const result = await handleOrgRedirect(params);

      const url = new URL(result?.redirect.destination || "");
      expect(url.searchParams.getAll("tags")).toEqual(["tag1", "tag2"]);
      expect(url.searchParams.get("filter")).toBe("active");
      expect(url.searchParams.get("orgRedirection")).toBe("true");
    });
  });

  describe("edge cases and error scenarios", () => {
    it("should handle empty slugs array", async () => {
      createRedirectScenario({ redirects: [] });

      const params = createTestRedirectParams({
        slugs: [],
      });
      const result = await handleOrgRedirect(params);

      expectPrismaCalledWith({ type: RedirectType.User, slugs: [] });
      expectNoRedirect(result);
    });

    it("should handle redirects with trailing slashes", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000/pro-example/",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams();
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000/pro-example/?orgRedirection=true");
      // Verify trailing slash is preserved
      const url = new URL(result?.redirect.destination || "");
      expect(url.pathname).toBe("/pro-example/");
    });

    it("should handle redirects to root path", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "pro",
            toUrl: "https://acme.cal.local:3000",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams();
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000?orgRedirection=true");
      // Verify root path redirect
      const url = new URL(result?.redirect.destination || "");
      expect(url.pathname).toBe("/");
    });

    it("should handle special characters in slugs", async () => {
      createRedirectScenario({
        redirects: [
          {
            from: "user-name.test",
            toUrl: "https://acme.cal.local:3000/user_name_test",
            type: RedirectType.User,
          },
        ],
      });

      const params = createTestRedirectParams({
        slugs: ["user-name.test"],
      });
      const result = await handleOrgRedirect(params);

      expectRedirectTo(result, "https://acme.cal.local:3000/user_name_test?orgRedirection=true");
      expectRedirectUsesData(result, "user_name_test");
    });
  });

  describe("when SINGLE_ORG_SLUG is not set", () => {
    beforeEach(() => {
      vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue(undefined);
    });

    it("should not check for redirects when in org context", async () => {
      const params = createTestRedirectParams({
        currentOrgDomain: "acme",
      });
      const result = await handleOrgRedirect(params);

      expectPrismaNotCalled();
      expectNoRedirect(result);
    });
  });
});

describe("getRedirectWithOriginAndSearchString", () => {
  beforeEach(() => {
    vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue(undefined);
  });

  afterEach(() => {
    prismaMock.tempOrgRedirect.findMany.mockReset();
  });

  it("should return origin and search string for absolute URL redirects", async () => {
    createRedirectScenario({
      redirects: [
        {
          from: "john",
          toUrl: "https://acme.cal.local:3000/john-org",
          type: RedirectType.User,
        },
      ],
    });

    const params = {
      slugs: ["john"],
      redirectType: RedirectType.User,
      context: createTestContext(),
      currentOrgDomain: null,
    };
    const result = await getRedirectWithOriginAndSearchString(params);

    expect(result).not.toBeNull();
    expect(result?.origin).toBe("https://acme.cal.local:3000");
    expect(result?.searchString).toBe("?orgRedirection=true");
  });

  it("should return null origin for relative path redirects", async () => {
    // Enable SINGLE_ORG_SLUG for this test to get relative paths
    vi.spyOn(constants, "SINGLE_ORG_SLUG", "get").mockReturnValue("acme");

    createRedirectScenario({
      redirects: [
        {
          from: "john",
          toUrl: "https://acme.cal.local:3000/john-org",
          type: RedirectType.User,
        },
      ],
    });

    const params = {
      slugs: ["john"],
      redirectType: RedirectType.User,
      context: createTestContext({ host: "my-instance.com" }),
      currentOrgDomain: "acme",
    };
    const result = await getRedirectWithOriginAndSearchString(params);

    expect(result).not.toBeNull();
    expect(result?.origin).toBeNull(); // Relative path has no origin
    expect(result?.searchString).toBe("?orgRedirection=true");
  });

  it("should preserve existing query parameters in search string", async () => {
    createRedirectScenario({
      redirects: [
        {
          from: "john",
          toUrl: "https://acme.cal.local:3000/john-org",
          type: RedirectType.User,
        },
      ],
    });

    const params = {
      slugs: ["john"],
      redirectType: RedirectType.User,
      context: createTestContext({ query: { foo: "bar", baz: "qux" } }),
      currentOrgDomain: null,
    };
    const result = await getRedirectWithOriginAndSearchString(params);

    expect(result).not.toBeNull();
    expect(result?.origin).toBe("https://acme.cal.local:3000");
    expect(result?.searchString).toBe("?foo=bar&baz=qux&orgRedirection=true");
  });

  it("should return null when no redirect exists", async () => {
    createRedirectScenario({ redirects: [] });

    const params = {
      slugs: ["john"],
      redirectType: RedirectType.User,
      context: createTestContext(),
      currentOrgDomain: null,
    };
    const result = await getRedirectWithOriginAndSearchString(params);

    expect(result).toBeNull();
  });
});
