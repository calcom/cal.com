import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";

import handleUserEvents from "./handleUserEvents";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/trpc/server/routers/viewer/teams/inviteMember/utils", () => ({
  getTeamOrThrow: vi.fn(),
  sendExistingUserTeamInviteEmails: vi.fn(),
  sendSignupToOrganizationEmail: vi.fn(),
}));

vi.mock("./assignValueToUser", () => ({
  assignValueToUserInOrgBulk: vi.fn(),
}));

vi.mock("./users/createUsersAndConnectToOrg", () => ({
  default: vi.fn(),
}));

vi.mock("./users/inviteExistingUserToOrg", () => ({
  default: vi.fn().mockResolvedValue({
    id: 1,
    username: "testuser",
    email: "test@example.com",
  }),
}));

vi.mock("./removeUserFromOrg", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    isAMemberOfOrganization: vi.fn().mockResolvedValue(false),
  })),
}));

async function createMockOrganization({ id, name, slug }: { id: number; name: string; slug: string }) {
  return prismock.team.create({
    data: {
      id,
      name,
      slug,
      isOrganization: true,
    },
  });
}

async function createMockUser({ email, organizationId }: { email: string; organizationId: number | null }) {
  return prismock.user.create({
    data: {
      email,
      username: email.split("@")[0],
      organizationId,
      completedOnboarding: true,
      identityProvider: IdentityProvider.CAL,
      locale: "en",
    },
  });
}

async function createMockMembership({
  userId,
  teamId,
  role = MembershipRole.MEMBER,
}: {
  userId: number;
  teamId: number;
  role?: MembershipRole;
}) {
  return prismock.membership.create({
    data: {
      userId,
      teamId,
      role,
      accepted: true,
      disableImpersonation: false,
    },
  });
}

describe("handleUserEvents", () => {
  const directoryId = "test-directory-id";
  const organizationId = 1001;
  const organizationName = "Test Organization";
  const organizationSlug = "test-org";

  beforeEach(async () => {
    vi.clearAllMocks();

    await createMockOrganization({
      id: organizationId,
      name: organizationName,
      slug: organizationSlug,
    });

    const { getTeamOrThrow } = await import("@calcom/trpc/server/routers/viewer/teams/inviteMember/utils");
    vi.mocked(getTeamOrThrow).mockResolvedValue({
      id: organizationId,
      name: organizationName,
      slug: organizationSlug,
      isOrganization: true,
      parent: null,
      parentId: null,
      metadata: null,
    } as Awaited<ReturnType<typeof getTeamOrThrow>>);
  });

  describe("Cross-tenant hijack prevention", () => {
    it("should throw an error when user belongs to a different organization", async () => {
      const userEmail = "user@example.com";
      const differentOrgId = 2002;

      await createMockOrganization({
        id: differentOrgId,
        name: "Different Organization",
        slug: "different-org",
      });

      await createMockUser({
        email: userEmail,
        organizationId: 9999,
      });

      const event: DirectorySyncEvent = {
        event: "user.created",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "Test",
          last_name: "User",
          active: true,
          raw: {
            schemas: [],
          },
        },
      };

      await expect(handleUserEvents(event, organizationId)).rejects.toThrow(
        "User belongs to another organization."
      );
    });

    it("should succeed when user belongs to the correct organization", async () => {
      const userEmail = "user@example.com";

      const user = await createMockUser({
        email: userEmail,
        organizationId: organizationId,
      });

      await createMockMembership({
        userId: user.id,
        teamId: organizationId,
      });

      const event: DirectorySyncEvent = {
        event: "user.created",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "Test",
          last_name: "User",
          active: true,
          raw: {
            schemas: [],
          },
        },
      };

      const { UserRepository } = await import("@calcom/features/users/repositories/UserRepository");
      vi.mocked(UserRepository).mockImplementation(
        () =>
          ({
            isAMemberOfOrganization: vi.fn().mockResolvedValue(true),
          } as unknown as InstanceType<typeof UserRepository>)
      );

      await expect(handleUserEvents(event, organizationId)).resolves.not.toThrow();
    });

    it("should pass when user has no organizationId (allow existing user to be added to an org)", async () => {
      const userEmail = "legacy@example.com";

      await createMockUser({
        email: userEmail,
        organizationId: null,
      });

      const event: DirectorySyncEvent = {
        event: "user.created",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "Legacy",
          last_name: "User",
          active: true,
          raw: {
            schemas: [],
          },
        },
      };

      await expect(handleUserEvents(event, organizationId)).resolves.toBeUndefined();
    });

    it("should succeed when user does not exist yet (new user creation)", async () => {
      const userEmail = "newuser@example.com";

      const event: DirectorySyncEvent = {
        event: "user.created",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "New",
          last_name: "User",
          active: true,
          raw: {
            schemas: [],
          },
        },
      };

      const createUsersAndConnectToOrg = (await import("./users/createUsersAndConnectToOrg")).default;
      vi.mocked(createUsersAndConnectToOrg).mockResolvedValue(undefined);

      await expect(handleUserEvents(event, organizationId)).resolves.not.toThrow();

      expect(createUsersAndConnectToOrg).toHaveBeenCalledWith({
        createUsersAndConnectToOrgProps: {
          emailsToCreate: [userEmail],
          identityProvider: IdentityProvider.CAL,
          identityProviderId: null,
        },
        org: expect.objectContaining({
          id: organizationId,
          name: organizationName,
        }),
      });
    });
  });

  describe("User activation and deactivation", () => {
    it("should invite existing user when active is true and user is not a member", async () => {
      const userEmail = "user@example.com";

      await createMockUser({
        email: userEmail,
        organizationId: organizationId,
      });

      const event: DirectorySyncEvent = {
        event: "user.updated",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "Test",
          last_name: "User",
          active: true,
          raw: {
            schemas: [],
          },
        },
      };

      const { UserRepository } = await import("@calcom/features/users/repositories/UserRepository");
      vi.mocked(UserRepository).mockImplementation(
        () =>
          ({
            isAMemberOfOrganization: vi.fn().mockResolvedValue(false),
          } as unknown as InstanceType<typeof UserRepository>)
      );

      const inviteExistingUserToOrg = (await import("./users/inviteExistingUserToOrg")).default;
      const sendExistingUserTeamInviteEmails = (
        await import("@calcom/trpc/server/routers/viewer/teams/inviteMember/utils")
      ).sendExistingUserTeamInviteEmails;

      await handleUserEvents(event, organizationId);

      expect(inviteExistingUserToOrg).toHaveBeenCalled();
      expect(sendExistingUserTeamInviteEmails).toHaveBeenCalled();
    });

    it("should remove user from organization when active is false", async () => {
      const userEmail = "user@example.com";

      const user = await createMockUser({
        email: userEmail,
        organizationId: organizationId,
      });

      const event: DirectorySyncEvent = {
        event: "user.updated",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "Test",
          last_name: "User",
          active: false,
          raw: {
            schemas: [],
          },
        },
      };

      const removeUserFromOrg = (await import("./removeUserFromOrg")).default;

      await handleUserEvents(event, organizationId);

      expect(removeUserFromOrg).toHaveBeenCalledWith({
        userId: user.id,
        orgId: organizationId,
      });
    });

    it("should sync custom attributes when user is already a member and active", async () => {
      const userEmail = "user@example.com";

      const user = await createMockUser({
        email: userEmail,
        organizationId: organizationId,
      });

      await createMockMembership({
        userId: user.id,
        teamId: organizationId,
      });

      const event: DirectorySyncEvent = {
        event: "user.updated",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "Test",
          last_name: "User",
          active: true,
          raw: {
            schemas: ["custom:enterprise"],
            "custom:enterprise": {
              department: "Engineering",
            },
          },
        },
      };

      const { UserRepository } = await import("@calcom/features/users/repositories/UserRepository");
      vi.mocked(UserRepository).mockImplementation(
        () =>
          ({
            isAMemberOfOrganization: vi.fn().mockResolvedValue(true),
          } as unknown as InstanceType<typeof UserRepository>)
      );

      const { assignValueToUserInOrgBulk } = await import("./assignValueToUser");

      await handleUserEvents(event, organizationId);

      expect(assignValueToUserInOrgBulk).toHaveBeenCalledWith({
        orgId: organizationId,
        userId: user.id,
        attributeLabelToValueMap: {
          department: "Engineering",
        },
        updater: {
          dsyncId: directoryId,
        },
      });
    });
  });

  describe("Error handling", () => {
    it("should throw an error when organization is not found", async () => {
      const userEmail = "user@example.com";
      const nonExistentOrgId = 9999;

      const event: DirectorySyncEvent = {
        event: "user.created",
        tenant: "test-tenant",
        directory_id: directoryId,
        data: {
          id: "user-123",
          email: userEmail,
          first_name: "Test",
          last_name: "User",
          active: true,
          raw: {
            schemas: [],
          },
        },
      };

      const { getTeamOrThrow } = await import("@calcom/trpc/server/routers/viewer/teams/inviteMember/utils");
      vi.mocked(getTeamOrThrow).mockResolvedValue(
        null as unknown as Awaited<ReturnType<typeof getTeamOrThrow>>
      );

      await expect(handleUserEvents(event, nonExistentOrgId)).rejects.toThrow("Org not found");
    });
  });
});
