import { TeamService } from "@calcom/lib/server/service/teamService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TAutoAcceptInviteInputSchema } from "./autoAcceptInvite.schema";

type AutoAcceptInviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAutoAcceptInviteInputSchema;
};

export const autoAcceptInviteHandler = async ({ ctx, input }: AutoAcceptInviteOptions) => {
  const { token } = input;
  return TeamService.inviteMemberByToken(token, ctx.user.id, true);
};

export default autoAcceptInviteHandler;
