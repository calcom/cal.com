import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TUpdateMembershipInputSchema } from "./updateMembership.schema";
type UpdateMembershipOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateMembershipInputSchema;
};
export declare const updateMembershipHandler: ({ ctx, input }: UpdateMembershipOptions) => Promise<{
    id: number;
    userId: number;
    teamId: number;
    role: import(".prisma/client").$Enums.MembershipRole;
    disableImpersonation: boolean;
    accepted: boolean;
}>;
export default updateMembershipHandler;
