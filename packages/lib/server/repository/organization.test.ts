import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Prisma } from "@calcom/prisma/client";
import { CreationSource, MembershipRole, WatchlistSeverity } from "@calcom/prisma/enums";

import { OrganizationRepository } from "./organization";

vi.mock("./teamUtils", () => ({
  getParsedTeam: (org: any) => org,
}));

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => {
      return () => key;
    },
  };
});

async function createOrganization(
  data: Prisma.TeamCreateInput & {
    organizationSettings: {
      create: Prisma.OrganizationSettingsCreateWithoutOrganizationInput;
    };
  }
) {
  return await prismock.team.create({
    data: {
      isOrganization: true,
      ...data,
    },
  });
}

async function createReviewedOrganization({
  name = "Test Org",
  orgAutoAcceptEmail,
}: {
  name: string;
  orgAutoAcceptEmail: string;
}) {
  return await createOrganization({
    name,
    organizationSettings: {
      create: {
        orgAutoAcceptEmail,
        isOrganizationVerified: true,
        isAdminReviewed: true,
      },
    },
  });
}

async function createTeam({
  name = "Test Team",
  orgAutoAcceptEmail,
}: {
  name: string;
  orgAutoAcceptEmail: string;
}) {
  return await prismock.team.create({
    data: {
      name,
      isOrganization: false,
      organizationSettings: {
        create: {
          orgAutoAcceptEmail,
        },
      },
    },
  });
}

beforeEach(async () => {
  vi.resetAllMocks();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await prismock.reset();
});

describe("Organization.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail", () => {
  it("should return null if no organization matches the email domain", async () => {
    const result = await OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toBeNull();
  });

  it("should throw an error if multiple organizations match the email domain", async () => {
    await createReviewedOrganization({ name: "Test Org 1", orgAutoAcceptEmail: "example.com" });
    await createReviewedOrganization({ name: "Test Org 2", orgAutoAcceptEmail: "example.com" });

    await expect(
      OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({ email: "test@example.com" })
    ).rejects.toThrow("Multiple organizations found with the same auto accept email domain");
  });

  it("should return the parsed organization if a single match is found", async () => {
    const organization = await createReviewedOrganization({
      name: "Test Org",
      orgAutoAcceptEmail: "example.com",
    });

    const result = await OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(organization);
  });

  it("should not confuse a team with organization", async () => {
    await createTeam({ name: "Test Team", orgAutoAcceptEmail: "example.com" });

    const result = await OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(null);
  });

  it("should correctly match orgAutoAcceptEmail", async () => {
    await createReviewedOrganization({ name: "Test Org", orgAutoAcceptEmail: "noexample.com" });

    const result = await OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(null);
  });
});

describe("Organization.getVerifiedOrganizationByAutoAcceptEmailDomain", () => {
  it("should return organization when domain matches and organization is verified", async () => {
    const verifiedOrganization = await createOrganization({
      name: "Test Org",
      organizationSettings: { create: { orgAutoAcceptEmail: "cal.com", isOrganizationVerified: true } },
    });

    const result = await OrganizationRepository.getVerifiedOrganizationByAutoAcceptEmailDomain("cal.com");

    expect(result).toEqual({
      id: verifiedOrganization.id,
      organizationSettings: {
        orgAutoAcceptEmail: "cal.com",
      },
    });
  });

  it("should not return organization when organization is not verified", async () => {
    await createOrganization({
      name: "Test Org",
      organizationSettings: { create: { orgAutoAcceptEmail: "cal.com", isOrganizationVerified: false } },
    });

    const result = await OrganizationRepository.getVerifiedOrganizationByAutoAcceptEmailDomain("cal.com");

    expect(result).toEqual(null);
  });
});

describe("Organization.createWithNonExistentOwner", () => {
  it("should create organization with non-existent owner", async () => {
    const orgData = {
      name: "Test Org",
      slug: "test-org",
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: "test.com",
      seats: 30,
      pricePerSeat: 37,
      isPlatform: false,
    };

    const createdOrg = await OrganizationRepository.createWithNonExistentOwner({
      orgData,
      owner: {
        email: "test@test.com",
      },
      creationSource: CreationSource.WEBAPP_NEW_ORG,
    });

    expect(createdOrg)
      .toHaveProperty("orgOwner")
      .toHaveProperty("organization")
      .toHaveProperty("ownerProfile");

    const { orgOwner, organization } = createdOrg;

    const user = await prismock.user.findFirst({
      where: {
        id: orgOwner.id,
      },
      include: {
        profiles: true,
        teams: true,
      },
    });

    expect(user).toEqual(
      expect.objectContaining({
        locked: false,
        creationSource: CreationSource.WEBAPP_NEW_ORG,
      })
    );

    expect(user.profiles).toHaveLength(1);
    expect(user.teams).toHaveLength(1);

    const userProfile = user.profiles[0];
    const userMembership = user.teams[0];

    expect(userProfile).toEqual(
      expect.objectContaining({
        organizationId: organization.id,
      })
    );

    expect(userMembership).toEqual(
      expect.objectContaining({
        teamId: organization.id,
        accepted: true,
        role: MembershipRole.OWNER,
      })
    );
  });

  it("should lock the organizer if they are on the watchlist", async () => {
    const orgData = {
      name: "Test Org",
      slug: "test-org",
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: "test.com",
      seats: 30,
      pricePerSeat: 37,
      isPlatform: false,
    };

    await prismock.watchlist.create({
      data: {
        type: "EMAIL",
        value: "test@test.com",
        severity: WatchlistSeverity.CRITICAL,
        createdById: 1,
      },
    });

    await OrganizationRepository.createWithNonExistentOwner({
      orgData,
      owner: {
        email: "test@test.com",
      },
      creationSource: CreationSource.WEBAPP_NEW_ORG,
    });

    const user = await prismock.user.findFirst({
      where: {
        email: "test@test.com",
      },
    });

    expect(user).toEqual(
      expect.objectContaining({
        locked: true,
        creationSource: CreationSource.WEBAPP_NEW_ORG,
      })
    );
  });
});
