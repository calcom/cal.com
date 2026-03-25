import { vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import type { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";

const mockedSingleton = mockDeep<OrganizationRepository>();

vi.mock("@calcom/features/ee/organizations/di/OrganizationRepository.container", () => ({
  getOrganizationRepository: () => mockedSingleton,
}));

beforeEach(() => {
  mockReset(mockedSingleton);
});

export const organizationScenarios = {
  organizationRepository: {
    findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fakeReturnOrganization: (org: any, forInput: any) => {
        mockedSingleton.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.mockImplementation((arg) => {
          if (forInput.email === arg.email) {
            return org;
          }
          const errorMsg = "Mock Error-fakeReturnOrganization: Unhandled input";
          console.log(errorMsg, { arg, forInput });
          throw new Error(errorMsg);
        });
      },
      fakeNoMatch: () => {
        mockedSingleton.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.mockResolvedValue(null);
      },
    },
  },
};

export { mockedSingleton as organizationRepositoryMock };
export default { organizationRepository: mockedSingleton };
