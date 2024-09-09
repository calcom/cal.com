import type { TrpcSessionUser } from "../../../trpc";
import type { TDeleteInputSchema } from "./delete.schema";
type DeleteOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TDeleteInputSchema;
};
export declare const deleteHandler: ({ ctx: _ctx, input }: DeleteOptions) => Promise<{
    id: number;
}>;
export {};
