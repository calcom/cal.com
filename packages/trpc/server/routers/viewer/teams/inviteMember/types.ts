import type { Team } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";

export type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

export type TeamWithParent = Team & {
  parent: Team | null;
};
