import { vi, beforeEach } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as organization from "@calcom/features/ee/organizations/repositories";

vi.mock("@calcom/features/ee/organizations/repositories", () => organizationMock);
type OrganizationModule = typeof organization;
beforeEach(() => {
  mockReset(organizationMock);
});

const organizationMock = mockDeep<OrganizationModule>();

export const organizationScenarios = {
  organizationRepository: {
    findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fakeReturnOrganization: (org: any, forInput: any) => {
        organizationMock.organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.mockImplementation(
          (arg) => {
            if (forInput.email === arg.email) {
              return org;
            }
            const errorMsg = "Mock Error-fakeReturnOrganization: Unhandled input";
            console.log(errorMsg, { arg, forInput });
            throw new Error(errorMsg);
          }
        );
      },
      fakeNoMatch: () => {
        organizationMock.organizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.mockResolvedValue(null);
      },
    },
  } satisfies Partial<Record<keyof OrganizationModule["organizationRepository"], unknown>>,
} satisfies Partial<Record<keyof OrganizationModule, unknown>>;

export default organizationMock;
