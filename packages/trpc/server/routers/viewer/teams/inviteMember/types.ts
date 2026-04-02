import type { Team } from "@calcom/prisma/client";
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

export enum INVITE_STATUS {
  USER_PENDING_MEMBER_OF_THE_ORG = "USER_PENDING_MEMBER_OF_THE_ORG",
  USER_ALREADY_INVITED_OR_MEMBER = "USER_ALREADY_INVITED_OR_MEMBER",
  USER_MEMBER_OF_OTHER_ORGANIZATION = "USER_MEMBER_OF_OTHER_ORGANIZATION",
  CAN_BE_INVITED = "CAN_BE_INVITED",
}
