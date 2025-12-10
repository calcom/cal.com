import { createTeamsHandler as createTeamsHandlerFromFeatures } from "@calcom/features/ee/organizations/lib/createTeams";

import { inviteMembersWithNoInviterPermissionCheck } from "../teams/inviteMember/inviteMember.handler";
import type { TCreateTeamsSchema } from "./createTeams.schema";

type CreateTeamsOptions = {
  ctx: {
    user: {
      id: number;
      organizationId: number | null;
    };
  };
  input: TCreateTeamsSchema;
};

export const createTeamsHandler = async ({ ctx, input }: CreateTeamsOptions) => {
  return createTeamsHandlerFromFeatures({ ctx, input }, inviteMembersWithNoInviterPermissionCheck);
};

export default createTeamsHandler;
