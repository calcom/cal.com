import { organizationScenarios } from "@calcom/features/ee/organizations/__mocks__/organizationMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";
import { CreationSource } from "@calcom/prisma/enums";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import { moveUserToMatchingOrg } from "./verify-email";

// TODO: This test passes but coverage is very low.
vi.mock("@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler");
vi.mock("@calcom/prisma", () => {
  return {
    prisma: vi.fn(),
  };
});

vi.mock("@calcom/features/ee/billing/stripe-billing-service", () => {
  return {
    StripeBillingService: vi.fn(),
  };
});

vi.mock("@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler", () => {
  return {
    inviteMembersWithNoInviterPermissionCheck: vi.fn(),
  };
});

describe("moveUserToMatchingOrg", () => {
  const email = "test@example.com";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should not proceed if no matching organization is found", async () => {
    organizationScenarios.organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.fakeNoMatch();

    await moveUserToMatchingOrg({ email });

    expect(inviteMembersWithNoInviterPermissionCheck).not.toHaveBeenCalled();
  });

  describe("should invite user to the matching organization", () => {
    const argToInviteMembersWithNoInviterPermissionCheck = {
      inviterName: null,
      language: "en",
      creationSource: CreationSource.WEBAPP,
      invitations: [
        {
          usernameOrEmail: email,
          role: MembershipRole.MEMBER,
        },
      ],
    };

    it("when organization has a slug and requestedSlug(slug is used)", async () => {
      const org = {
        id: "org123",
        slug: "test-org",
        requestedSlug: "requested-test-org",
      };

      organizationScenarios.organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.fakeReturnOrganization(
        org,
        { email }
      );

      await moveUserToMatchingOrg({ email });

      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledWith({
        ...argToInviteMembersWithNoInviterPermissionCheck,
        teamId: org.id,
        orgSlug: org.slug,
      });
    });

    it("when organization has requestedSlug only", async () => {
      const org = {
        id: "org123",
        slug: null,
        requestedSlug: "requested-test-org",
      };

      organizationScenarios.organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.fakeReturnOrganization(
        org,
        { email }
      );

      await moveUserToMatchingOrg({ email });

      expect(inviteMembersWithNoInviterPermissionCheck).toHaveBeenCalledWith({
        ...argToInviteMembersWithNoInviterPermissionCheck,
        teamId: org.id,
        orgSlug: org.requestedSlug,
      });
    });
  });
});
