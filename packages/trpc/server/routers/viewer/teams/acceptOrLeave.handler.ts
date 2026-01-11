import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";

type AcceptOrLeaveOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAcceptOrLeaveInputSchema;
};

export const acceptOrLeaveHandler = async ({ ctx, input }: AcceptOrLeaveOptions) => {
  if (input.accept) {
    await TeamService.acceptTeamMembership({
      userId: ctx.user.id,
      teamId: input.teamId,
      userEmail: ctx.user.email,
      username: ctx.user.username,
    });
  } else {
    await TeamService.leaveTeamMembership({
      userId: ctx.user.id,
      teamId: input.teamId,
    });
  }
};

export default acceptOrLeaveHandler;
