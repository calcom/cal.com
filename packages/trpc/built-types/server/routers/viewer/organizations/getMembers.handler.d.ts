import type { TrpcSessionUser } from "../../../trpc";
import type { TGetMembersInputSchema } from "./getMembers.schema";
type CreateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetMembersInputSchema;
};
export declare const getMembersHandler: ({ input, ctx }: CreateOptions) => Promise<{
    id: number;
    userId: number;
    teamId: number;
    user: {
        id: number;
        name: string | null;
        email: string;
        username: string | null;
        avatarUrl: string | null;
        completedOnboarding: boolean;
    };
    role: import(".prisma/client").$Enums.MembershipRole;
    disableImpersonation: boolean;
    accepted: boolean;
}[]>;
export default getMembersHandler;
