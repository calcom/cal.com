import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { OrganizationRepository } from "./organization";

vi.mock("./teamUtils", () => ({
  getParsedTeam: (org: any) => org,
}));

describe("Organization.findUniqueByMatchingAutoAcceptEmail", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();
  });

  it("should return null if no organization matches the email domain", async () => {
    const result = await OrganizationRepository.findUniqueByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toBeNull();
  });

  it("should throw an error if multiple organizations match the email domain", async () => {
    await createOrganization({ name: "Test Org 1", orgAutoAcceptEmail: "example.com" });
    await createOrganization({ name: "Test Org 2", orgAutoAcceptEmail: "example.com" });

    await expect(
      OrganizationRepository.findUniqueByMatchingAutoAcceptEmail({ email: "test@example.com" })
    ).rejects.toThrow("Multiple organizations found with the same auto accept email domain");
  });

  it("should return the parsed organization if a single match is found", async () => {
    const organization = await createOrganization({ name: "Test Org", orgAutoAcceptEmail: "example.com" });

    const result = await OrganizationRepository.findUniqueByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(organization);
  });

  it("should not confuse a team with organization", async () => {
    await createTeam({ name: "Test Team", orgAutoAcceptEmail: "example.com" });

    const result = await OrganizationRepository.findUniqueByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(null);
  });

  it("should correctly match orgAutoAcceptEmail", async () => {
    await createOrganization({ name: "Test Org", orgAutoAcceptEmail: "noexample.com" });

    const result = await OrganizationRepository.findUniqueByMatchingAutoAcceptEmail({
      email: "test@example.com",
    });

    expect(result).toEqual(null);
  });
});

async function createOrganization({
  name = "Test Org",
  orgAutoAcceptEmail,
}: {
  name: string;
  orgAutoAcceptEmail: string;
}) {
  return await prismock.team.create({
    data: {
      name,
      isOrganization: true,
      organizationSettings: {
        create: {
          orgAutoAcceptEmail,
        },
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
