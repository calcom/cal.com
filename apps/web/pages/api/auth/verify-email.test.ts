import { organizationScenarios } from "@calcom/lib/server/repository/__mocks__/organization";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { MembershipRole } from "@calcom/prisma/client";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import { moveUserToMatchingOrg } from "./verify-email";

vi.mock("@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler");
vi.mock("@calcom/lib/server/repository/organization");

describe("moveUserToMatchingOrg", () => {
  const email = "test@example.com";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should not proceed if no matching organization is found", async () => {
    organizationScenarios.OrganizationRepository.findUniqueByMatchingAutoAcceptEmail.fakeNoMatch();

    await moveUserToMatchingOrg({ email });

    expect(inviteMembersWithNoInviterPermissionCheck).not.toHaveBeenCalled();
  });

  describe("should invite user to the matching organization", () => {
    const argToInviteMembersWithNoInviterPermissionCheck = {
      inviterName: null,
      language: "en",
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

      organizationScenarios.OrganizationRepository.findUniqueByMatchingAutoAcceptEmail.fakeReturnOrganization(
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

      organizationScenarios.OrganizationRepository.findUniqueByMatchingAutoAcceptEmail.fakeReturnOrganization(
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
