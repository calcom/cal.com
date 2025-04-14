import { TeamRepository } from "@calcom/lib/server/repository/team";
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

  return TeamRepository.inviteMemberByToken(token, ctx.user.id);
};

export default inviteMemberByTokenHandler;
