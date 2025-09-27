import { TeamService } from "@calcom/lib/server/service/teamService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";

type AcceptOrLeaveOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAcceptOrLeaveInputSchema;
};

export const acceptOrLeaveHandler = async ({ ctx, input }: AcceptOrLeaveOptions) => {
  await TeamService.acceptOrLeaveTeamMembership({
    accept: input.accept,
    userId: ctx.user.id,
    teamId: input.teamId,
    userEmail: ctx.user.email,
    username: ctx.user.username,
  });
};

export default acceptOrLeaveHandler;
