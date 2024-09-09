import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TDeleteInputSchema } from "./delete.schema";
type DeleteOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TDeleteInputSchema;
};
export declare const deleteHandler: ({ ctx, input }: DeleteOptions) => Promise<{
    id: string;
}>;
export {};
