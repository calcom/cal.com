import { mapBusinessErrorToTRPCError } from "@calcom/lib/errorMapping";
import { AuthorizationError } from "@calcom/lib/errors";
import { isTeamOwner } from "@calcom/lib/server/queries/teams";
import { TeamService } from "@calcom/lib/server/service/team";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  try {
    if (!(await isTeamOwner(ctx.user?.id, input.teamId)))
      throw new AuthorizationError("Unauthorized to delete team");

    return await TeamService.delete({ id: input.teamId });
  } catch (error) {
    throw mapBusinessErrorToTRPCError(error);
  }
};

export default deleteHandler;
