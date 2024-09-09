import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TDeleteMeInputSchema } from "./deleteMe.schema";
type DeleteMeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TDeleteMeInputSchema;
};
export declare const deleteMeHandler: ({ ctx, input }: DeleteMeOptions) => Promise<void>;
export {};
