import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { it, describe, expect } from "vitest";

import { getTeam, getOrg } from "./team";

const sampleTeamProps = {
  logo: null,
  appLogo: null,
  bio: null,
  description: null,
  hideBranding: false,
  isPrivate: false,
  appIconLogo: null,
  hideBookATeamMember: false,
  createdAt: new Date(),
  theme: null,
  brandColor: "",
  darkBrandColor: "",
  timeFormat: null,
  timeZone: "",
  weekStart: "",
  parentId: null,
};

describe("getOrg", () => {
  it("should return an Organization correctly by slug even if there is a team with the same slug", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: {
          isOrganization: true,
        },
      },
    ]);

    const org = await getOrg({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
        metadata: {
          path: ["isOrganization"],
          equals: true,
        },
      },
      select: {
        id: true,
        slug: true,
        metadata: true,
      },
    });
    expect(org?.metadata?.isOrganization).toBe(true);
  });

  it("should not return an org result if metadata.isOrganization isn't true", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: {},
      },
    ]);

    const org = await getOrg({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
        metadata: {
          path: ["isOrganization"],
          equals: true,
        },
      },
      select: {
        id: true,
        slug: true,
        metadata: true,
      },
    });
    expect(org).toBe(null);
  });

  it("should error if metadata isn't valid", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: [],
      },
    ]);

    await expect(() =>
      getOrg({
        lookupBy: {
          slug: "test-slug",
        },
        forOrgWithSlug: null,
        teamSelect: {
          id: true,
          slug: true,
        },
      })
    ).rejects.toThrow("invalid_type");
  });
});

describe("getTeam", () => {
  it("should query a team correctly", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: {
          anything: "here",
          paymentId: "1",
        },
      },
    ]);

    const team = await getTeam({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        metadata: true,
      },
    });
    expect(team).not.toBeNull();
    // 'anything' is not in the teamMetadata schema, so it should be stripped out
    expect(team?.metadata).toEqual({ paymentId: "1" });
  });

  it("should not return a team result if the queried result isn't a team", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: {
          isOrganization: true,
        },
      },
    ]);

    const team = await getTeam({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        metadata: true,
      },
    });
    expect(team).toBe(null);
  });

  it("should return a team by slug within an org", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        parentId: 100,
        metadata: null,
      },
    ]);

    await getTeam({
      lookupBy: {
        slug: "team-in-test-org",
      },
      forOrgWithSlug: "test-org",
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "team-in-test-org",
        parent: {
          OR: [
            {
              slug: "test-org",
            },
            {
              metadata: {
                path: ["requestedSlug"],
                equals: "test-org",
              },
            },
          ],
          metadata: {
            path: ["isOrganization"],
            equals: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        metadata: true,
      },
    });
  });

  it("should return a team by requestedSlug within an org", async () => {
    prismaMock.team.findMany.mockResolvedValue([]);
    await getTeam({
      lookupBy: {
        slug: "test-team",
      },
      forOrgWithSlug: "test-org",
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });
    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-team",
        parent: {
          metadata: {
            path: ["isOrganization"],
            equals: true,
          },
          OR: [
            {
              slug: "test-org",
            },
            {
              metadata: {
                path: ["requestedSlug"],
                equals: "test-org",
              },
            },
          ],
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        metadata: true,
      },
    });
  });
});
