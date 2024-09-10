import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TLazyLoadMembersInputSchema } from "./lazyLoadMembers.schema";
type LazyLoadMembersHandlerOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TLazyLoadMembersInputSchema;
};
export declare const lazyLoadMembersHandler: ({ ctx, input }: LazyLoadMembersHandlerOptions) => Promise<{
    members: {
        username: string | null;
        role: import(".prisma/client").$Enums.MembershipRole;
        profile: import("@calcom/types/UserProfile").UserProfile;
        organizationId: number | null;
        organization: any;
        accepted: boolean;
        disableImpersonation: boolean;
        bookerUrl: string;
        id: number;
        name: string | null;
        email: string;
        bio: string | null;
        avatarUrl: string | null;
        nonProfileUsername: string | null;
    }[];
    nextCursor: number | undefined;
}>;
export default lazyLoadMembersHandler;
