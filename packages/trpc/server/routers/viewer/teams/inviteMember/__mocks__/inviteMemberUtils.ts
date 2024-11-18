import { beforeEach, vi, expect } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type { MembershipRole } from "@calcom/prisma/enums";

import type * as inviteMemberUtils from "../utils";

vi.mock("../utils", async () => {
  return inviteMemberUtilsMock;
});

beforeEach(() => {
  mockReset(inviteMemberUtilsMock);
});
const inviteMemberUtilsMock = mockDeep<typeof inviteMemberUtils>();

export const inviteMemberutilsScenarios = {
  checkPermissions: {
    fakePassed: () =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      inviteMemberUtilsMock.checkPermissions.mockResolvedValue(undefined),
  },
  getTeamOrThrow: {
    fakeReturnTeam: (team: { id: number } & Record<string, any>, forInput: { teamId: number }) => {
      const fakedVal = {
        organizationSettings: null,
        parent: null,
        parentId: null,
        ...team,
      };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      inviteMemberUtilsMock.getTeamOrThrow.mockImplementation((teamId) => {
        if (forInput.teamId === teamId) {
          return fakedVal;
        }
        console.log("Mock Error: Unhandled input", { teamId });
        throw new Error(`Mock Error: Unhandled input. teamId: ${teamId}`);
      });
      return fakedVal;
    },
  },
  getOrgState: {
    /**
     * `getOrgState` completely generates the return value from input without using any outside variable like DB, etc.
     * So, it makes sense to let it use the actual implementation instead of mocking the output based on input
     */
    useActual: async function () {
      const actualImport = await vi.importActual<typeof inviteMemberUtils>("../utils");

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      return inviteMemberUtilsMock.getOrgState.mockImplementation(actualImport.getOrgState);
    },
  },
  getUniqueInvitationsOrThrowIfEmpty: {
    useActual: async function () {
      const actualImport = await vi.importActual<typeof inviteMemberUtils>("../utils");

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      return inviteMemberUtilsMock.getUniqueInvitationsOrThrowIfEmpty.mockImplementation(
        actualImport.getUniqueInvitationsOrThrowIfEmpty
      );
    },
  },
  findUsersWithInviteStatus: {
    useAdvancedMock: function (
      returnVal: Awaited<ReturnType<typeof inviteMemberUtilsMock.findUsersWithInviteStatus>>,
      forInput: {
        team: any;
        invitations: {
          usernameOrEmail: string;
          newRole?: MembershipRole;
        }[];
      }
    ) {
      inviteMemberUtilsMock.findUsersWithInviteStatus.mockImplementation(({ invitations, team }) => {
        const allInvitationsExist = invitations.every((invitation) =>
          forInput.invitations.find((i) => i.usernameOrEmail === invitation.usernameOrEmail)
        );
        if (forInput.team.id == team.id && allInvitationsExist) return Promise.resolve(returnVal);
        return Promise.resolve([]);
      });
      return Promise.resolve(returnVal);
    },
  },
  getOrgConnectionInfo: {
    useActual: async function () {
      const actualImport = await vi.importActual<typeof inviteMemberUtils>("../utils");

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      return inviteMemberUtilsMock.getOrgConnectionInfo.mockImplementation(actualImport.getOrgConnectionInfo);
    },
  },
};

export const expects = {
  expectSignupEmailsToBeSent: ({
    emails,
    team,
    inviterName,
    isOrg,
    teamId,
  }: {
    emails: string[];
    team: any[];
    inviterName: string;
    teamId: number;
    isOrg: boolean;
  }) => {
    emails.forEach((email, index) => {
      expect(inviteMemberUtilsMock.sendSignupToOrganizationEmail.mock.calls[index][0]).toEqual(
        expect.objectContaining({
          usernameOrEmail: email,
          team: team,
          inviterName: inviterName,
          teamId: teamId,
          isOrg: isOrg,
        })
      );
    });
  },
};
export default inviteMemberUtilsMock;
