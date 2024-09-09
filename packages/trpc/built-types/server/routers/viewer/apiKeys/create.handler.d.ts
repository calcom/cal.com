import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";
type CreateHandlerOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCreateInputSchema;
};
export declare const createHandler: ({ ctx, input }: CreateHandlerOptions) => Promise<string>;
export {};
