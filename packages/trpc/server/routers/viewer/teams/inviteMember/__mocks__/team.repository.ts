import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as teamRepository from "@calcom/lib/server/repository/team";

type TeamRepositoryModule = typeof teamRepository;

const teamRepositoryMock = mockDeep<TeamRepositoryModule>();

export const teamRepositoryMockScenarios = {
  getTeamOrThrow: {
    fakeReturnTeam: (team: { id: number } & Record<string, any>, forInput: { teamId: number }) => {
      const fakedVal = {
        organizationSettings: null,
        parent: null,
        parentId: null,
        ...team,
      };
      teamRepositoryMock.TeamRepository.getTeamOrThrow.mockImplementation(async (teamId) => {
        if (forInput.teamId === teamId) {
          return Promise.resolve(fakedVal);
        }
        console.log("Mock Error: Unhandled input", { teamId });
        throw new Error(`Mock Error: Unhandled input. teamId: ${teamId}`);
      });
      return fakedVal;
    },
  },
};

beforeEach(() => {
  mockReset(teamRepositoryMock);
});

vi.mock("@calcom/lib/server/repository/team", () => ({
  TeamRepository: {
    getTeamOrThrow: teamRepositoryMock.TeamRepository.getTeamOrThrow,
  },
}));

export default teamRepositoryMock;
