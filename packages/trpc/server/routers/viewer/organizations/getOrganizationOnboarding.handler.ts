import { PrismaOrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";

import type { TrpcSessionUser } from "../../../types";

type OrganizationOnboarding = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function getOrganizationOnboardingHandler({ ctx }: OrganizationOnboarding) {
  const { user: loggedInUser } = ctx;

  const organizationOnboarding = await PrismaOrganizationOnboardingRepository.findByOrgOwnerEmail(
    loggedInUser.email
  );

  return organizationOnboarding;
}

export default getOrganizationOnboardingHandler;
