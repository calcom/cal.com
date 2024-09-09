import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import type { TeamWithParent } from "./types";
type InviteMemberOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TInviteMemberInputSchema;
};
type TargetTeam = {
    teamId: number;
} | {
    team: TeamWithParent;
};
export declare const inviteMembersWithNoInviterPermissionCheck: (data: {
    language: string;
    inviterName: string | null;
    orgSlug: string | null;
    invitations: {
        usernameOrEmail: string;
        role: MembershipRole;
    }[];
} & TargetTeam) => Promise<{
    usernameOrEmail: string | string[];
    numUsersInvited: number;
}>;
export default function inviteMemberHandler({ ctx, input }: InviteMemberOptions): Promise<{
    usernameOrEmail: string | string[];
    numUsersInvited: number;
}>;
export {};
