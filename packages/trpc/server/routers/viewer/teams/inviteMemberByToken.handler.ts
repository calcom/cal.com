import { TeamService } from "@calcom/lib/server/service/team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";

type InviteMemberByTokenOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberByTokenSchemaInputSchema;
};

export const inviteMemberByTokenHandler = async ({ ctx, input }: InviteMemberByTokenOptions) => {
  const { token } = input;

  return TeamService.inviteMemberByToken(token, ctx.user.id);
};

export default inviteMemberByTokenHandler;
