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
  parent:
    | (Team & {
        organizationSettings: {
          id: number;
          isOrganizationVerified: boolean;
          isOrganizationConfigured: boolean;
          orgAutoAcceptEmail: string | null;
          isAdminAPIEnabled: boolean;
        } | null;
      })
    | null;
  organizationSettings: {
    id: number;
    isOrganizationVerified: boolean;
    isOrganizationConfigured: boolean;
    orgAutoAcceptEmail: string | null;
    isAdminAPIEnabled: boolean;
  } | null;
};
