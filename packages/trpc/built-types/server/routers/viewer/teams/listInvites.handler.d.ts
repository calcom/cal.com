import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type ListInvitesOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listInvitesHandler: ({ ctx }: ListInvitesOptions) => Promise<{
    id: number;
    userId: number;
    teamId: number;
    role: import(".prisma/client").$Enums.MembershipRole;
    disableImpersonation: boolean;
    accepted: boolean;
}[]>;
export default listInvitesHandler;
