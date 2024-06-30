import prismaMock from "../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, beforeEach } from "vitest";

import { RedirectType } from "@calcom/prisma/client";

import { getTemporaryOrgRedirect } from "./getTemporaryOrgRedirect";

const mockData = {
  redirects: [] as {
    toUrl: string;
    from: string;
    redirectType: RedirectType;
  }[],
};

function mockARedirectInDB({
  toUrl,
  slug,
  redirectType,
}: {
  toUrl: string;
  slug: string;
  redirectType: RedirectType;
}) {
  mockData.redirects.push({
    toUrl,
    from: slug,
    redirectType,
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  prismaMock.tempOrgRedirect.findMany.mockImplementation(({ where }) => {
    return new Promise((resolve) => {
      const tempOrgRedirects: typeof mockData.redirects = [];
      where.from.in.forEach((whereSlug: string) => {
        const matchingRedirect = mockData.redirects.find((redirect) => {
          return where.type === redirect.redirectType && whereSlug === redirect.from && where.fromOrgId === 0;
        });
        if (matchingRedirect) {
          tempOrgRedirects.push(matchingRedirect);
        }
      });
      resolve(tempOrgRedirects);
    });
  });
}

beforeEach(() => {
  mockData.redirects = [];
});

describe("getTemporaryOrgRedirect", () => {
  it("should generate event-type URL without existing query params", async () => {
    mockARedirectInDB({ slug: "slug", toUrl: "https://calcom.cal.com", redirectType: RedirectType.User });
    const redirect = await getTemporaryOrgRedirect({
      slugs: "slug",
      redirectType: RedirectType.User,
      eventTypeSlug: "30min",
      currentQuery: {},
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/30min?orgRedirection=true",
      },
    });
  });

  it("should generate event-type URL with existing query params", async () => {
    mockARedirectInDB({ slug: "slug", toUrl: "https://calcom.cal.com", redirectType: RedirectType.User });

    const redirect = await getTemporaryOrgRedirect({
      slugs: "slug",
      redirectType: RedirectType.User,
      eventTypeSlug: "30min",
      currentQuery: {
        abc: "1",
      },
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/30min?abc=1&orgRedirection=true",
      },
    });
  });

  it("should generate User URL with existing query params", async () => {
    mockARedirectInDB({ slug: "slug", toUrl: "https://calcom.cal.com", redirectType: RedirectType.User });

    const redirect = await getTemporaryOrgRedirect({
      slugs: "slug",
      redirectType: RedirectType.User,
      eventTypeSlug: null,
      currentQuery: {
        abc: "1",
      },
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com?abc=1&orgRedirection=true",
      },
    });
  });

  it("should generate Team Profile URL with existing query params", async () => {
    mockARedirectInDB({
      slug: "seeded-team",
      toUrl: "https://calcom.cal.com",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: "seeded-team",
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      currentQuery: {
        abc: "1",
      },
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com?abc=1&orgRedirection=true",
      },
    });
  });

  it("should generate Team Event URL with existing query params", async () => {
    mockARedirectInDB({
      slug: "seeded-team",
      toUrl: "https://calcom.cal.com",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: "seeded-team",
      redirectType: RedirectType.Team,
      eventTypeSlug: "30min",
      currentQuery: {
        abc: "1",
      },
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/30min?abc=1&orgRedirection=true",
      },
    });
  });

  it("should generate Team Event URL without query params", async () => {
    mockARedirectInDB({
      slug: "seeded-team",
      toUrl: "https://calcom.cal.com",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: "seeded-team",
      redirectType: RedirectType.Team,
      eventTypeSlug: "30min",
      currentQuery: {},
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/30min?orgRedirection=true",
      },
    });
  });

  it("should generate Dynamic Group Booking Profile Url", async () => {
    mockARedirectInDB({
      slug: "first",
      toUrl: "https://calcom.cal.com/first-in-org1",
      redirectType: RedirectType.Team,
    });
    mockARedirectInDB({
      slug: "second",
      toUrl: "https://calcom.cal.com/second-in-org1",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: ["first", "second"],
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      currentQuery: {},
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/first-in-org1+second-in-org1?orgRedirection=true",
      },
    });
  });

  it("should generate Dynamic Group Booking Profile Url - same order", async () => {
    mockARedirectInDB({
      slug: "second",
      toUrl: "https://calcom.cal.com/second-in-org1",
      redirectType: RedirectType.Team,
    });
    mockARedirectInDB({
      slug: "first",
      toUrl: "https://calcom.cal.com/first-in-org1",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: ["first", "second"],
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      currentQuery: {},
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/first-in-org1+second-in-org1?orgRedirection=true",
      },
    });

    const redirect1 = await getTemporaryOrgRedirect({
      slugs: ["second", "first"],
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      currentQuery: {},
    });

    expect(redirect1).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/second-in-org1+first-in-org1?orgRedirection=true",
      },
    });
  });

  it("should generate Dynamic Group Booking Profile Url with query params", async () => {
    mockARedirectInDB({
      slug: "first",
      toUrl: "https://calcom.cal.com/first-in-org1",
      redirectType: RedirectType.Team,
    });
    mockARedirectInDB({
      slug: "second",
      toUrl: "https://calcom.cal.com/second-in-org1",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: ["first", "second"],
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      currentQuery: {
        abc: "1",
      },
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/first-in-org1+second-in-org1?abc=1&orgRedirection=true",
      },
    });
  });

  it("should generate Dynamic Group Booking EventType Url", async () => {
    mockARedirectInDB({
      slug: "first",
      toUrl: "https://calcom.cal.com/first-in-org1",
      redirectType: RedirectType.Team,
    });
    mockARedirectInDB({
      slug: "second",
      toUrl: "https://calcom.cal.com/second-in-org1",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: ["first", "second"],
      redirectType: RedirectType.Team,
      eventTypeSlug: "30min",
      currentQuery: {},
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/first-in-org1+second-in-org1/30min?orgRedirection=true",
      },
    });
  });

  it("should generate Dynamic Group Booking EventType Url with query params", async () => {
    mockARedirectInDB({
      slug: "first",
      toUrl: "https://calcom.cal.com/first-in-org1",
      redirectType: RedirectType.Team,
    });
    mockARedirectInDB({
      slug: "second",
      toUrl: "https://calcom.cal.com/second-in-org1",
      redirectType: RedirectType.Team,
    });

    const redirect = await getTemporaryOrgRedirect({
      slugs: ["first", "second"],
      redirectType: RedirectType.Team,
      eventTypeSlug: "30min",
      currentQuery: {
        abc: "1",
      },
    });

    expect(redirect).toEqual({
      redirect: {
        permanent: false,
        destination: "https://calcom.cal.com/first-in-org1+second-in-org1/30min?abc=1&orgRedirection=true",
      },
    });
  });
});
