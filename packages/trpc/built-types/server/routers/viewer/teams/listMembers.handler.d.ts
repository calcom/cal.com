import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TListMembersInputSchema } from "./listMembers.schema";
type ListMembersOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TListMembersInputSchema;
};
export declare const listMembersHandler: ({ ctx, input }: ListMembersOptions) => Promise<({
    id: number;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
} & {
    accepted: boolean;
} & {
    nonProfileUsername: string | null;
    profile: import("@calcom/types/UserProfile").UserProfile;
})[]>;
export default listMembersHandler;
