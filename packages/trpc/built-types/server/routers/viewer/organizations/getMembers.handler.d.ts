import type { TrpcSessionUser } from "../../../trpc";
import type { TGetMembersInputSchema } from "./getMembers.schema";
type CreateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetMembersInputSchema;
};
export declare const getMembersHandler: ({ input, ctx }: CreateOptions) => Promise<{
    user: {
        name: string | null;
        id: number;
        email: string;
        username: string | null;
        avatarUrl: string | null;
        completedOnboarding: boolean;
    };
    id: number;
    userId: number;
    teamId: number;
    role: import(".prisma/client").$Enums.MembershipRole;
    disableImpersonation: boolean;
    accepted: boolean;
}[]>;
export default getMembersHandler;
