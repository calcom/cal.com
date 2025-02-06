import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOtherTeamHandler = async ({ ctx: { user } }: ListOptions) => {
  if (!user?.organization?.isOrgAdmin) {
    return [];
  }

  return await OrganizationRepository.findTeamsInOrgIamNotPartOf({
    userId: user.id,
    parentId: user?.organization?.id ?? null,
  });
};

export default listOtherTeamHandler;
