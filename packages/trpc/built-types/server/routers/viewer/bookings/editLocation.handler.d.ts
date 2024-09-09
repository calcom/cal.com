import type { TrpcSessionUser } from "../../../trpc";
import type { TEditLocationInputSchema } from "./editLocation.schema";
import type { BookingsProcedureContext } from "./util";
type EditLocationOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    } & BookingsProcedureContext;
    input: TEditLocationInputSchema;
};
export declare const editLocationHandler: ({ ctx, input }: EditLocationOptions) => Promise<{
    message: string;
}>;
export {};
