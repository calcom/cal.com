import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";
type GetMembershipbyUserOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetMembershipbyUserInputSchema;
};
export declare const getMembershipbyUserHandler: ({ ctx, input }: GetMembershipbyUserOptions) => Promise<{
    id: number;
    userId: number;
    teamId: number;
    role: import(".prisma/client").$Enums.MembershipRole;
    disableImpersonation: boolean;
    accepted: boolean;
} | null>;
export default getMembershipbyUserHandler;
