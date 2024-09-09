import type { TrpcSessionUser } from "../../../trpc";
import type { ZDeleteInputSchema } from "./delete.schema";
type Options = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZDeleteInputSchema;
};
export declare const deleteHandler: ({ ctx, input }: Options) => Promise<null>;
export default deleteHandler;
