import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TRemoveMemberInputSchema } from "./removeMember.schema";
type RemoveMemberOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
        sourceIp?: string;
    };
    input: TRemoveMemberInputSchema;
};
export declare const removeMemberHandler: ({ ctx, input }: RemoveMemberOptions) => Promise<void>;
export default removeMemberHandler;
