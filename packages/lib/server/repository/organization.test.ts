import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Prisma } from "@calcom/prisma/client";

import { OrganizationRepository } from "./organization";

vi.mock("./teamUtils", () => ({
  getParsedTeam: (org: any) => org,
}));

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
