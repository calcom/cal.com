/**
 * This file is deprecated in favour of inviteMember.handler.integration-test.ts
 *
 * It mocks a lot of things that are untested and integration tests make more sense for this handler
 */
import { scenarios as checkRateLimitAndThrowErrorScenarios } from "../../../../../../../tests/libs/__mocks__/checkRateLimitAndThrowError";
import { mock as getTranslationMock } from "../../../../../../../tests/libs/__mocks__/getTranslation";
import {
  inviteMemberutilsScenarios as inviteMemberUtilsScenarios,
  default as inviteMemberUtilsMock,
} from "./__mocks__/inviteMemberUtils";
import { constantsScenarios } from "@calcom/lib/__mocks__/constants";

import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Profile } from "@calcom/prisma/client";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import inviteMemberHandler from "./inviteMember.handler";
import { INVITE_STATUS } from "./types";

vi.mock("@trpc/server", () => {
  return {
    TRPCError: class TRPCError {
      code: string;
      message: unknown;
      constructor({ code, message }: { code: string; message: unknown }) {
        this.code = code;
        this.message = message;
      }
    },
  };
});

vi.mock("@calcom/prisma", () => {
  return {
    prisma: vi.fn(),
  };
});

// Mock PBAC dependencies - these need to be mocked before PermissionCheckService
vi.mock("@calcom/features/pbac/infrastructure/repositories/PermissionRepository");
vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/features/membership/repositories/MembershipRepository");
vi.mock("@calcom/features/pbac/services/permission.service", () => {
  return {
    PermissionService: vi.fn().mockImplementation(() => ({
      validatePermission: vi.fn().mockReturnValue({ isValid: true }),
      validatePermissions: vi.fn().mockReturnValue({ isValid: true }),
    })),
  };
});

vi.mock("@calcom/features/pbac/services/permission-check.service", () => {
  return {
    PermissionCheckService: vi.fn().mockImplementation(() => ({
      checkPermission: vi.fn().mockResolvedValue(true),
      checkPermissions: vi.fn().mockResolvedValue(true),
      getUserPermissions: vi.fn().mockResolvedValue([]),
      getResourcePermissions: vi.fn().mockResolvedValue([]),
      getTeamIdsWithPermission: vi.fn().mockResolvedValue([]),
      getTeamIdsWithPermissions: vi.fn().mockResolvedValue([]),
    })),
  };
});

function fakeNoUsersFoundMatchingInvitations(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  team: any;
  invitations: {
    role: MembershipRole;
    usernameOrEmail: string;
  }[];
}) {
  inviteMemberUtilsScenarios.findUsersWithInviteStatus.useAdvancedMock([], args);
}

function getPersonalProfile({ username }: { username: string }) {
  return {
    id: null,
    upId: "abc",
    organization: null,
    organizationId: null,
    username,
    startTime: 0,
    endTime: 0,
    avatarUrl: "",
    name: "",
    bufferTime: 0,
  };
}

function getLoggedInUser() {
  return {
    id: 123,
    name: "John Doe",
    organization: {
      id: 456,
      isOrgAdmin: true,
      metadata: null,
      requestedSlug: null,
    },
    profile: getPersonalProfile({ username: "john_doe" }),
  } as NonNullable<TrpcSessionUser>;
}

function buildExistingUser(user: { id: number; email: string; username: string }) {
  return {
    password: {
      hash: "hash",
      userId: 1,
    },
    identityProvider: IdentityProvider.CAL,
    profiles: [] as Profile[],
    completedOnboarding: false,
    ...user,
  };
}

describe("inviteMemberHandler", () => {
  beforeEach(async () => {
    await inviteMemberUtilsScenarios.getOrgState.useActual();
    await inviteMemberUtilsScenarios.getUniqueInvitationsOrThrowIfEmpty.useActual();
    await inviteMemberUtilsScenarios.getOrgConnectionInfo.useActual();
    checkRateLimitAndThrowErrorScenarios.fakeRateLimitPassed();
    getTranslationMock.fakeIdentityFn();
    inviteMemberUtilsScenarios.checkPermissions.fakePassed();
    constantsScenarios.enableTeamBilling();
  });

  describe("Regular Team", () => {
    describe("with 2 emails in input and when there are no users matching the emails", () => {
      it("should call appropriate utilities to send email, add users and update in stripe. It should return `numUsersInvited`=2", async () => {
        const usersToBeInvited = [
          {
            id: 1,
            email: "user1@example.com",
          },
          {
            id: 2,
            email: "user2@example.com",
          },
        ];

        const loggedInUser = getLoggedInUser();

        const input = {
          teamId: 1,
          role: MembershipRole.MEMBER,
          isOrg: false,
          language: "en",
          usernameOrEmail: usersToBeInvited.map((u) => u.email),
        };

        const team = {
          id: input.teamId,
          name: "Team 1",
          parent: null,
        };

        const retValueOfGetTeamOrThrowError = inviteMemberUtilsScenarios.getTeamOrThrow.fakeReturnTeam(team, {
          teamId: input.teamId,
        });

        const allExpectedInvitations = [
          {
            role: input.role,
            usernameOrEmail: usersToBeInvited[0].email,
          },
          {
            role: input.role,
            usernameOrEmail: usersToBeInvited[1].email,
          },
        ];
        fakeNoUsersFoundMatchingInvitations({
          team,
          invitations: allExpectedInvitations,
        });

        const ctx = {
          user: loggedInUser,
        };

        // Call the inviteMemberHandler function
        const result = await inviteMemberHandler({ ctx, input });
        const expectedConnectionInfoMap = {
          [usersToBeInvited[0].email]: {
            orgId: undefined,
            autoAccept: false,
          },
          [usersToBeInvited[1].email]: {
            orgId: undefined,
            autoAccept: false,
          },
        };

        const inviter = {
          name: loggedInUser.name,
        };

        expect(inviteMemberUtilsMock.handleNewUsersInvites).toHaveBeenCalledWith({
          invitationsForNewUsers: allExpectedInvitations,
          team: retValueOfGetTeamOrThrowError,
          orgConnectInfoByUsernameOrEmail: expectedConnectionInfoMap,
          teamId: input.teamId,
          language: input.language,
          inviter,
          autoAcceptEmailDomain: null,
        });

        // TODO: Fix this test
        // expect(paymentsMock.updateQuantitySubscriptionFromStripe).toHaveBeenCalledWith(input.teamId);

        expect(inviteMemberUtilsMock.handleExistingUsersInvites).not.toHaveBeenCalled();

        expect(inviteMemberUtilsMock.getUniqueInvitationsOrThrowIfEmpty).toHaveBeenCalledWith([
          {
            role: input.role,
            usernameOrEmail: usersToBeInvited[0].email,
          },
          {
            role: input.role,
            usernameOrEmail: usersToBeInvited[1].email,
          },
        ]);
        // Assert the result
        expect(result).toEqual({
          usernameOrEmail: input.usernameOrEmail,
          numUsersInvited: 2,
        });
      });
    });

    describe("with 2 emails in input and when there is one user matching the email", () => {
      // TODO: Fix this test
      it.skip("should call appropriate utilities to add users and update in stripe. It should return `numUsersInvited=2`", async () => {
        const usersToBeInvited = [
          buildExistingUser({
            id: 1,
            email: "user1@example.com",
            username: "user1",
          }),
          {
            id: null,
            email: "user2@example.com",
          },
        ] as const;

        const loggedInUser = getLoggedInUser();

        const input = {
          teamId: 1,
          role: MembershipRole.MEMBER,
          language: "en",
          usernameOrEmail: usersToBeInvited.map((u) => u.email),
        };

        const team = {
          id: input.teamId,
          name: "Team 1",
          parent: null,
          isOrganization: false,
        };

        const retValueOfGetTeamOrThrowError = inviteMemberUtilsScenarios.getTeamOrThrow.fakeReturnTeam(team, {
          teamId: input.teamId,
        });

        const allExpectedInvitations = [
          {
            role: input.role,
            usernameOrEmail: usersToBeInvited[0].email,
          },
          {
            role: input.role,
            usernameOrEmail: usersToBeInvited[1].email,
          },
        ];

        const retValueOfFindUsersWithInviteStatus =
          await inviteMemberUtilsScenarios.findUsersWithInviteStatus.useAdvancedMock(
            [
              {
                ...usersToBeInvited[0],
                canBeInvited: INVITE_STATUS.CAN_BE_INVITED,
                newRole: input.role,
              },
            ],
            {
              invitations: allExpectedInvitations,
              team,
            }
          );

        const ctx = {
          user: loggedInUser,
        };

        const result = await inviteMemberHandler({ ctx, input });
        const expectedConnectionInfoMap = {
          [usersToBeInvited[0].email]: {
            orgId: undefined,
            autoAccept: false,
          },
          [usersToBeInvited[1].email]: {
            orgId: undefined,
            autoAccept: false,
          },
        };
        const inviter = {
          name: loggedInUser.name,
        };

        expect(inviteMemberUtilsMock.handleNewUsersInvites).toHaveBeenCalledWith({
          invitationsForNewUsers: allExpectedInvitations.slice(1),
          team: retValueOfGetTeamOrThrowError,
          orgConnectInfoByUsernameOrEmail: expectedConnectionInfoMap,
          teamId: input.teamId,
          language: input.language,
          inviter,
          autoAcceptEmailDomain: null,
          isOrg: false,
        });

        // TODO: Fix this test
        // expect(paymentsMock.updateQuantitySubscriptionFromStripe).toHaveBeenCalledWith(input.teamId);

        expect(inviteMemberUtilsMock.handleExistingUsersInvites).toHaveBeenCalledWith({
          invitableExistingUsers: retValueOfFindUsersWithInviteStatus,
          teamId: input.teamId,
          language: input.language,
          inviter,
          orgConnectInfoByUsernameOrEmail: expectedConnectionInfoMap,
          orgSlug: null,
          team: retValueOfGetTeamOrThrowError,
          isOrg: false,
        });

        // Assert the result
        expect(result).toEqual({
          usernameOrEmail: input.usernameOrEmail,
          numUsersInvited: 2,
        });
      });
    });

    it("With one email in input and that email is already a member of the team, it should throw error", async () => {
      const userToBeInvited = buildExistingUser({
        id: 1,
        email: "user1@example.com",
        username: "user1",
      });

      const loggedInUser = getLoggedInUser();

      const input = {
        teamId: 1,
        role: MembershipRole.MEMBER,
        isOrg: false,
        language: "en",
        usernameOrEmail: userToBeInvited.email,
      };

      const team = {
        id: input.teamId,
        name: "Team 1",
        parent: null,
      };

      inviteMemberUtilsScenarios.getTeamOrThrow.fakeReturnTeam(team, {
        teamId: input.teamId,
      });

      inviteMemberUtilsScenarios.findUsersWithInviteStatus.useAdvancedMock(
        [
          {
            ...userToBeInvited,
            canBeInvited: INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER,
            newRole: input.role,
          },
        ],
        {
          invitations: [
            {
              newRole: input.role,
              usernameOrEmail: userToBeInvited.email,
            },
          ],
          team,
        }
      );

      const ctx = {
        user: loggedInUser,
      };
      try {
        await inviteMemberHandler({ ctx, input });
        throw new Error("Expected an error to be thrown");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        expect(e).toBeInstanceOf(TRPCError);
        expect(e.code).toEqual("BAD_REQUEST");
        expect(e.message).toBe(INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER);
      }
    });

    it("With one email that is already a member and isDirectUserAction=false, it should NOT throw error", async () => {
      const userToBeInvited = buildExistingUser({
        id: 1,
        email: "user1@example.com",
        username: "user1",
      });

      const loggedInUser = getLoggedInUser();

      const team = {
        id: 1,
        name: "Team 1",
        parent: null,
        isOrganization: false,
      };

      inviteMemberUtilsScenarios.getTeamOrThrow.fakeReturnTeam(team, {
        teamId: team.id,
      });

      inviteMemberUtilsScenarios.findUsersWithInviteStatus.useAdvancedMock(
        [
          {
            ...userToBeInvited,
            canBeInvited: INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER,
            newRole: MembershipRole.MEMBER,
          },
        ],
        {
          invitations: [
            {
              role: MembershipRole.MEMBER,
              usernameOrEmail: userToBeInvited.email,
            },
          ],
          team,
        }
      );

      // Call inviteMembersWithNoInviterPermissionCheck directly with isDirectUserAction=false
      const { inviteMembersWithNoInviterPermissionCheck } = await import("./inviteMember.handler");

      const result = await inviteMembersWithNoInviterPermissionCheck({
        inviterName: loggedInUser.name,
        teamId: team.id,
        language: "en",
        creationSource: "WEBAPP" as const,
        orgSlug: null,
        invitations: [
          {
            usernameOrEmail: userToBeInvited.email,
            role: MembershipRole.MEMBER,
          },
        ],
        isDirectUserAction: false,
      });

      // Should not throw error, should return successfully with 0 users invited
      expect(result).toEqual({
        usernameOrEmail: userToBeInvited.email,
        numUsersInvited: 0,
      });

      // Verify that handleNewUsersInvites and handleExistingUsersInvites were not called
      // since the user is already a member
      expect(inviteMemberUtilsMock.handleNewUsersInvites).not.toHaveBeenCalled();
      expect(inviteMemberUtilsMock.handleExistingUsersInvites).not.toHaveBeenCalled();
    });

    it("With multiple emails where some are already members and isDirectUserAction=false, it should NOT throw error and invite only eligible users", async () => {
      const existingMember = buildExistingUser({
        id: 1,
        email: "existing@example.com",
        username: "existing",
      });

      const newUser = {
        id: null,
        email: "newuser@example.com",
      };

      const team = {
        id: 1,
        name: "Team 1",
        parent: null,
        isOrganization: false,
      };

      inviteMemberUtilsScenarios.getTeamOrThrow.fakeReturnTeam(team, {
        teamId: team.id,
      });

      const allInvitations = [
        {
          role: MembershipRole.MEMBER,
          usernameOrEmail: existingMember.email,
        },
        {
          role: MembershipRole.MEMBER,
          usernameOrEmail: newUser.email,
        },
      ];

      inviteMemberUtilsScenarios.findUsersWithInviteStatus.useAdvancedMock(
        [
          {
            ...existingMember,
            canBeInvited: INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER,
            newRole: MembershipRole.MEMBER,
          },
        ],
        {
          invitations: allInvitations,
          team,
        }
      );

      // Call inviteMembersWithNoInviterPermissionCheck directly with isDirectUserAction=false
      const { inviteMembersWithNoInviterPermissionCheck } = await import("./inviteMember.handler");

      const result = await inviteMembersWithNoInviterPermissionCheck({
        inviterName: "Test Inviter",
        teamId: team.id,
        language: "en",
        creationSource: "WEBAPP" as const,
        orgSlug: null,
        invitations: allInvitations,
        isDirectUserAction: false,
      });

      // Should not throw error, should return successfully with 1 user invited (the new user)
      expect(result).toEqual({
        usernameOrEmail: [existingMember.email, newUser.email],
        numUsersInvited: 1,
      });

      // Verify that only new user was invited
      expect(inviteMemberUtilsMock.handleNewUsersInvites).toHaveBeenCalledWith(
        expect.objectContaining({
          invitationsForNewUsers: [
            {
              role: MembershipRole.MEMBER,
              usernameOrEmail: newUser.email,
            },
          ],
        })
      );
    });
  });

  it("When rate limit exceeded, it should throw error", async () => {
    const userToBeInvited = buildExistingUser({
      id: 1,
      email: "user1@example.com",
      username: "user1",
    });

    const errorMessageForRateLimit = checkRateLimitAndThrowErrorScenarios.fakeRateLimitFailed();

    const loggedInUser = getLoggedInUser();

    const input = {
      teamId: 1,
      role: MembershipRole.MEMBER,
      isOrg: false,
      language: "en",
      usernameOrEmail: userToBeInvited.email,
    };

    const ctx = {
      user: loggedInUser,
    };
    try {
      await inviteMemberHandler({ ctx, input });
      throw new Error("Expected an error to be thrown");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toEqual(errorMessageForRateLimit);
    }
  });
});
