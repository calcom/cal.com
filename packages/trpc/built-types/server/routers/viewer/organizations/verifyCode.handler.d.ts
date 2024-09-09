import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type VerifyCodeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZVerifyCodeInputSchema;
};
export declare const verifyCodeHandler: ({ ctx, input }: VerifyCodeOptions) => Promise<true>;
export default verifyCodeHandler;
