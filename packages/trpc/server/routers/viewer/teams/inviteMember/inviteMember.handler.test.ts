import { scenarios as checkRateLimitAndThrowErrorScenarios } from "../../../../../../../tests/libs/__mocks__/checkRateLimitAndThrowError";
import { mock as getTranslationMock } from "../../../../../../../tests/libs/__mocks__/getTranslation";
import {
  inviteMemberutilsScenarios as inviteMemberUtilsScenarios,
  default as inviteMemberUtilsMock,
  expects as inviteMemberUtilsExpects,
} from "./__mocks__/inviteMemberUtils";
import { default as paymentsMock } from "@calcom/features/ee/teams/lib/__mocks__/payments";
import { constantsScenarios } from "@calcom/lib/__mocks__/constants";

import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Profile } from "@calcom/prisma/client";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import inviteMemberHandler from "./inviteMember.handler";
import { INVITE_STATUS } from "./utils";

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

function fakeNoUsersFoundMatchingInvitations(args: {
  team: any;
  invitations: {
    newRole: MembershipRole;
    usernameOrEmail: string;
  }[];
}) {
  inviteMemberUtilsScenarios.getExistingUsersWithInviteStatus.useAdvancedMock([], args);
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

        const teamFromDb = inviteMemberUtilsScenarios.getTeamOrThrow.fakeReturnTeam(team, {
          teamId: input.teamId,
        });

        fakeNoUsersFoundMatchingInvitations({
          team,
          invitations: [
            {
              newRole: input.role,
              usernameOrEmail: usersToBeInvited[0].email,
            },
            {
              newRole: input.role,
              usernameOrEmail: usersToBeInvited[1].email,
            },
          ],
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

        expect(inviteMemberUtilsMock.createNewUsersConnectToOrgIfExists).toHaveBeenCalledWith({
          autoAcceptEmailDomain: null,
          connectionInfoMap: expectedConnectionInfoMap,
          invitations: [
            {
              usernameOrEmail: usersToBeInvited[0].email,
              role: input.role,
            },
            {
              usernameOrEmail: usersToBeInvited[1].email,
              role: input.role,
            },
          ],
          isOrg: false,
          parentId: null,
          teamId: input.teamId,
        });

        inviteMemberUtilsExpects.expectSignupEmailsToBeSent({
          emails: usersToBeInvited.map((u) => u.email),
          team: {
            name: team.name,
            parent: team.parent,
          },
          inviterName: loggedInUser.name as string,
          teamId: 1,
          isOrg: false,
        });

        expect(paymentsMock.updateQuantitySubscriptionFromStripe).toHaveBeenCalledWith(input.teamId);

        expect(inviteMemberUtilsMock.handleExistingUsersInvites).toHaveBeenCalledWith({
          existingUsersWithMemberships: [],
          input: input,
          inviter: loggedInUser,
          orgConnectInfoByUsernameOrEmail: expectedConnectionInfoMap,
          orgSlug: null,
          team: teamFromDb,
        });

        // Assert the result
        expect(result).toEqual({
          ...input,
          numUsersInvited: 2,
        });
      });
    });

    describe("with 2 emails in input and when there is one user matching the email", () => {
      it("should call appropriate utilities to send email, add users and update in stripe. It should return `numUsersInvited=2`", async () => {
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

        const retValueOfGetExistingUsersWithInviteStatus =
          inviteMemberUtilsScenarios.getExistingUsersWithInviteStatus.useAdvancedMock(
            [
              {
                ...usersToBeInvited[0],
                canBeInvited: INVITE_STATUS.CAN_BE_INVITED,
                newRole: input.role,
              },
            ],
            {
              invitations: [
                {
                  newRole: input.role,
                  usernameOrEmail: usersToBeInvited[0].email,
                },
                {
                  newRole: input.role,
                  usernameOrEmail: usersToBeInvited[1].email,
                },
              ],
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

        expect(inviteMemberUtilsMock.createNewUsersConnectToOrgIfExists).toHaveBeenCalledWith({
          autoAcceptEmailDomain: null,
          connectionInfoMap: expectedConnectionInfoMap,
          invitations: [
            {
              usernameOrEmail: usersToBeInvited[1].email,
              role: input.role,
            },
          ],
          isOrg: false,
          parentId: null,
          teamId: input.teamId,
        });

        inviteMemberUtilsExpects.expectSignupEmailsToBeSent({
          emails: [usersToBeInvited[1].email],
          team: {
            name: team.name,
            parent: team.parent,
          },
          inviterName: loggedInUser.name as string,
          teamId: 1,
          isOrg: false,
        });

        expect(paymentsMock.updateQuantitySubscriptionFromStripe).toHaveBeenCalledWith(input.teamId);

        expect(inviteMemberUtilsMock.handleExistingUsersInvites).toHaveBeenCalledWith({
          existingUsersWithMemberships: retValueOfGetExistingUsersWithInviteStatus,
          input: input,
          inviter: loggedInUser,
          orgConnectInfoByUsernameOrEmail: expectedConnectionInfoMap,
          orgSlug: null,
          team: retValueOfGetTeamOrThrowError,
        });

        // Assert the result
        expect(result).toEqual({
          ...input,
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

      inviteMemberUtilsScenarios.getExistingUsersWithInviteStatus.useAdvancedMock(
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
