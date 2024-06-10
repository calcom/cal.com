import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as inviteMemberUtils from "../utils";

vi.mock("../utils", () => inviteMemberUtilsMock);

beforeEach(() => {
  mockReset(inviteMemberUtilsMock);
});
const inviteMemberUtilsMock = mockDeep<typeof inviteMemberUtils>();

export const mock = {
  checkPermissions: {
    fakePassed: () =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      inviteMemberUtilsMock.checkPermissions.mockResolvedValue(undefined),
  },
  getTeamOrThrow: {
    fakeReturnTeam: (team: { id: number } & Record<string, any>, forInput: { teamId: number }) =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      inviteMemberUtilsMock.getTeamOrThrow.mockImplementation((teamId) => {
        if (forInput.teamId === teamId) {
          return {
            organizationSettings: null,
            parent: null,
            ...team,
          };
        }
        throw new Error("Mock Error: Unhandled input");
      }),
  },
  getOrgState: {
    useActual: async function () {
      const actualImport = await vi.importActual<typeof inviteMemberUtils>("../utils");

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      return inviteMemberUtilsMock.getOrgState.mockImplementation(actualImport.getOrgState);
    },
  },
  getUniqueUsernameOrEmailsOrThrow: {
    useActual: async function () {
      const actualImport = await vi.importActual<typeof inviteMemberUtils>("../utils");

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      return inviteMemberUtilsMock.getUniqueUsernameOrEmailsOrThrow.mockImplementation(
        actualImport.getUniqueUsernameOrEmailsOrThrow
      );
    },
  },
  getExistingUsersWithInviteStatus: {
    useAdvancedMock: function (
      returnVal: Awaited<ReturnType<typeof inviteMemberUtilsMock.getExistingUsersWithInviteStatus>>
    ) {
      return inviteMemberUtilsMock.getExistingUsersWithInviteStatus.mockImplementation(() => {
        return returnVal;
      });
    },
  },
};

export default inviteMemberUtilsMock;
