import { getAllWorkflows } from "@calcom/ee/workflows/lib/getAllWorkflows";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";

type GetAllActiveWorkflowsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllActiveWorkflowsInputSchema;
};

export const getAllActiveWorkflowsHandler = async ({ input }: GetAllActiveWorkflowsOptions) => {
  const { eventTypeWorkflows, userId, teamId } = input;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

  const allActiveWorkflows = await getAllWorkflows(eventTypeWorkflows, userId, teamId, orgId);

  return allActiveWorkflows;
};
