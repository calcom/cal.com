import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { ZCreateInputSchema } from "./create.schema";
type Options = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZCreateInputSchema;
};
export declare const createHandler: ({ ctx, input }: Options) => Promise<{
    newGroupName: string;
}>;
export default createHandler;
