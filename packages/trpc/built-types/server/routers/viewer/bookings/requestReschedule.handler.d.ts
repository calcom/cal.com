import type { TrpcSessionUser } from "../../../trpc";
import type { TRequestRescheduleInputSchema } from "./requestReschedule.schema";
type RequestRescheduleOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TRequestRescheduleInputSchema;
};
export declare const requestRescheduleHandler: ({ ctx, input }: RequestRescheduleOptions) => Promise<void>;
export {};
