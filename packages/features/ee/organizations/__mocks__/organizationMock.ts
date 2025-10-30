import { vi, beforeEach } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as organization from "@calcom/features/ee/organizations/repositories/OrganizationRepository";

vi.mock("@calcom/features/ee/organizations/repositories/OrganizationRepository", () => organizationMock);
type OrganizationModule = typeof organization;
beforeEach(() => {
  mockReset(organizationMock);
});

const organizationMock = mockDeep<OrganizationModule>();
const OrganizationRepository = organizationMock.OrganizationRepository;

export const organizationScenarios = {
  OrganizationRepository: {
    findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fakeReturnOrganization: (org: any, forInput: any) => {
        OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.mockImplementation(
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
        OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail.mockResolvedValue(null);
      },
    },
  } satisfies Partial<Record<keyof OrganizationModule["OrganizationRepository"], unknown>>,
} satisfies Partial<Record<keyof OrganizationModule, unknown>>;

export default organizationMock;
