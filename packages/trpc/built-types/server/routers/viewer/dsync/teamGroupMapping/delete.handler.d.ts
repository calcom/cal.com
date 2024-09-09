import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { ZDeleteInputSchema } from "./delete.schema";
type Options = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZDeleteInputSchema;
};
export declare const deleteHandler: ({ ctx, input }: Options) => Promise<{
    deletedGroupName: string;
}>;
export default deleteHandler;
