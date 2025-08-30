import type { Team } from "@prisma/client";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";

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
