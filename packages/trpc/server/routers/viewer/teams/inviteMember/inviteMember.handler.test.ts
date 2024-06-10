import { mock as checkRateLimitAndThrowErrorMock } from "../../../../../../../tests/libs/__mocks__/checkRateLimitAndThrowError";
import { mock as getTranslationMock } from "../../../../../../../tests/libs/__mocks__/getTranslation";
import { mock as inviteMemberUtilsMock } from "./__mocks__/inviteMemberUtils";

import { describe, it, expect } from "vitest";

import inviteMemberHandler from "./inviteMember.handler";
import { INVITE_STATUS } from "./utils";

function fakeAllUsersExist(usersToBeInvited: { id: number; email: string }[]) {
  inviteMemberUtilsMock.getExistingUsersWithInviteStatus.useAdvancedMock([
    {
      id: usersToBeInvited[0].id,
      email: usersToBeInvited[0].email,
      // TODO: Why do we need password ?
      completedOnboarding: false,
      identityProvider: "CAL",
      profiles: [],
      teams: [
        {
          userId: 1,
          teamId: 1,
          accepted: false,
          role: "MEMBER",
        },
      ],
      username: "user1",
      canBeInvited: INVITE_STATUS.CAN_BE_INVITED,
      newRole: "MEMBER",
      password: "",
    },
    {
      id: usersToBeInvited[1].id,
      email: usersToBeInvited[1].email,
      // TODO: Why do we need password ?
      completedOnboarding: false,
      identityProvider: "CAL",
      profiles: [],
      teams: [
        {
          userId: 1,
          teamId: 1,
          accepted: false,
          role: "MEMBER",
        },
      ],
      username: "user1",
      canBeInvited: INVITE_STATUS.CAN_BE_INVITED,
      newRole: "MEMBER",
      password: "",
    },
  ]);
}

function fakeNoUserExist() {
  inviteMemberUtilsMock.getExistingUsersWithInviteStatus.useAdvancedMock([]);
}

function getPersonalProfile({ username }: { username: string }) {
  return {
    id: null,
    upId: "abc",
    organization: null,
    username,
  };
}

describe("inviteMemberHandler", () => {
  it("should invite new users and return the correct response", async () => {
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
    const loggedInUser = {
      id: 123,
      name: "John Doe",
      organization: {
        id: 456,
        isOrgAdmin: true,
      },
      profile: getPersonalProfile({ username: "john_doe" }),
    };

    // Mock the input data
    const input = {
      teamId: 1,
      role: "MEMBER",
      isOrg: false,
      language: "en",
      usernameOrEmail: usersToBeInvited.map((u) => u.email),
    };

    getTranslationMock.fakeIdentityFn();
    checkRateLimitAndThrowErrorMock.fakeRateLimitPassed();
    inviteMemberUtilsMock.getTeamOrThrow.fakeReturnTeam(
      {
        id: 1,
      },
      {
        teamId: input.teamId,
      }
    );
    inviteMemberUtilsMock.checkPermissions.fakePassed();
    await inviteMemberUtilsMock.getOrgState.useActual();
    await inviteMemberUtilsMock.getUniqueUsernameOrEmailsOrThrow.useActual();
    fakeNoUserExist();

    // Mock the context
    const ctx = {
      user: loggedInUser,
    };

    // Call the inviteMemberHandler function
    const result = await inviteMemberHandler({ ctx, input });

    // Assert the result
    expect(result).toEqual({
      ...input,
      numUsersInvited: 2,
    });
  });
});
