import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import type { Prisma } from "@calcom/prisma/client";

vi.mock("@calcom/features/ee/teams/lib/getParsedTeam", () => ({
  getParsedTeam: <T>(org: T) => org,
}));

const organizationRepository = new OrganizationRepository({ prismaClient: prismock });

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
    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toBeNull();
  });

  it("should return null if multiple organizations match the email domain", async () => {
    await createReviewedOrganization({ name: "Test Org 1", orgAutoAcceptEmail: "example.com" });
    await createReviewedOrganization({ name: "Test Org 2", orgAutoAcceptEmail: "example.com" });

    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toBeNull();
  });

  it("should return the parsed organization if a single match is found", async () => {
    const organization = await createReviewedOrganization({
      name: "Test Org",
      orgAutoAcceptEmail: "example.com",
    });

    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(organization);
  });

  it("should not confuse a team with organization", async () => {
    await createTeam({ name: "Test Team", orgAutoAcceptEmail: "example.com" });

    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(null);
  });

  it("should correctly match orgAutoAcceptEmail", async () => {
    await createReviewedOrganization({ name: "Test Org", orgAutoAcceptEmail: "noexample.com" });

    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(null);
  });

  it("should return null when orgAutoJoinOnSignup is false", async () => {
    await prismock.team.create({
      data: {
        name: "Test Org",
        isOrganization: true,
        organizationSettings: {
          create: {
            orgAutoAcceptEmail: "example.com",
            isOrganizationVerified: true,
            isAdminReviewed: true,
            orgAutoJoinOnSignup: false,
          },
        },
      },
    });

    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toBeNull();
  });

  it("should return organization when orgAutoJoinOnSignup is true", async () => {
    const organization = await prismock.team.create({
      data: {
        name: "Test Org",
        isOrganization: true,
        organizationSettings: {
          create: {
            orgAutoAcceptEmail: "example.com",
            isOrganizationVerified: true,
            isAdminReviewed: true,
            orgAutoJoinOnSignup: true,
          },
        },
      },
    });

    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(organization);
  });

  it("should return organization when orgAutoJoinOnSignup is not explicitly set (defaults to true)", async () => {
    const organization = await createReviewedOrganization({
      name: "Test Org",
      orgAutoAcceptEmail: "example.com",
    });

    const result = await organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(organization);
  });
});

describe("Organization.getVerifiedOrganizationByAutoAcceptEmailDomain", () => {
  it("should return organization when domain matches and organization is verified", async () => {
    const verifiedOrganization = await createOrganization({
      name: "Test Org",
      organizationSettings: { create: { orgAutoAcceptEmail: "cal.com", isOrganizationVerified: true } },
    });

    const result = await organizationRepository.getVerifiedOrganizationByAutoAcceptEmailDomain("cal.com");

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

    const result = await organizationRepository.getVerifiedOrganizationByAutoAcceptEmailDomain("cal.com");

    expect(result).toEqual(null);
  });
});

describe("Organization.create", () => {
  it("should create organization with branding data (logoUrl, brandColor, bannerUrl)", async () => {
    const orgData = {
      name: "Test Organization",
      slug: "test-org",
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: "test.com",
      seats: 10,
      pricePerSeat: 15,
      isPlatform: false,
      billingPeriod: "MONTHLY" as const,
      logoUrl: "https://example.com/logo.png",
      bio: "Test organization bio",
      brandColor: "#FF5733",
      bannerUrl: "https://example.com/banner.jpg",
    };

    const organization = await organizationRepository.create(orgData);

    expect(organization).toMatchObject({
      name: "Test Organization",
      slug: "test-org",
      isOrganization: true,
      logoUrl: "https://example.com/logo.png",
      bio: "Test organization bio",
      brandColor: "#FF5733",
      bannerUrl: "https://example.com/banner.jpg",
    });
  });

  it("should create organization with null branding data", async () => {
    const orgData = {
      name: "Test Organization",
      slug: "test-org-2",
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: "test.com",
      seats: null,
      pricePerSeat: null,
      isPlatform: false,
      logoUrl: null,
      bio: null,
      brandColor: null,
      bannerUrl: null,
    };

    const organization = await organizationRepository.create(orgData);

    expect(organization).toMatchObject({
      name: "Test Organization",
      slug: "test-org-2",
      isOrganization: true,
      logoUrl: null,
      bio: null,
      brandColor: null,
      bannerUrl: null,
    });
  });
});
