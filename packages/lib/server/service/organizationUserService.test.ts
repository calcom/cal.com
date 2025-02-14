import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, test, vi } from "vitest";

import { IdentityProvider } from "@calcom/prisma/enums";

import { OrganizationUserService } from "./organizationUserService";

vi.stubEnv("ORGANIZATIONS_AUTOLINK", "1");

describe("OrganizationUserService", () => {
  test("should not pass an org id if no org is found", async () => {
    prismock;
    const result = await OrganizationUserService.checkIfUserShouldBelongToOrg(
      IdentityProvider.GOOGLE,
      "test@nonorg.com"
    );

    expect(result).toEqual({ orgUsername: "test", orgId: undefined });
  });

  test("should pass an org id if an org is found", async () => {
    await prismock.team.create({
      data: {
        name: "Test Org",
        organizationSettings: {
          create: {
            isOrganizationVerified: true,
            orgAutoAcceptEmail: "org.com",
          },
        },
      },
    });

    const result = await OrganizationUserService.checkIfUserShouldBelongToOrg(
      IdentityProvider.GOOGLE,
      "test@org.com"
    );

    expect(result).toEqual({ orgUsername: "test", orgId: 1 });
  });

  test("If org is found but does not match auto accept email, should not pass an org id", async () => {
    await prismock.team.create({
      data: {
        name: "Test Org",
        organizationSettings: {
          create: {
            isOrganizationVerified: true,
            orgAutoAcceptEmail: "org2.com",
          },
        },
      },
    });

    const result = await OrganizationUserService.checkIfUserShouldBelongToOrg(
      IdentityProvider.GOOGLE,
      "test@org.com"
    );

    expect(result).toEqual({ orgUsername: "test", orgId: undefined });
  });
});
