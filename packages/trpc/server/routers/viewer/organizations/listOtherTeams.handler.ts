import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOtherTeamHandler = async ({ ctx: { user } }: ListOptions) => {
  if (!user?.organization?.isOrgAdmin) {
    return [];
  }

  const organizationRepository = getOrganizationRepository();
  return await organizationRepository.findTeamsInOrgIamNotPartOf({
    userId: user.id,
    parentId: user?.organization?.id ?? null,
  });
};

export default listOtherTeamHandler;
