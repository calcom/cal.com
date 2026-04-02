import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import type { TrpcSessionUser } from "../../../types";

type OrganizationOnboarding = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function getOrganizationOnboardingHandler({ ctx }: OrganizationOnboarding) {
  const { user: loggedInUser } = ctx;

  const organizationOnboarding = await OrganizationOnboardingRepository.findByOrgOwnerEmail(
    loggedInUser.email
  );

  return organizationOnboarding;
}

export default getOrganizationOnboardingHandler;
