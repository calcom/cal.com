import type { TrpcSessionUser } from "../../../trpc";
import type { TAddGuestsInputSchema } from "./addGuests.schema";
type AddGuestsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAddGuestsInputSchema;
};
export declare const addGuestsHandler: ({ ctx, input }: AddGuestsOptions) => Promise<{
    message: string;
}>;
export {};
