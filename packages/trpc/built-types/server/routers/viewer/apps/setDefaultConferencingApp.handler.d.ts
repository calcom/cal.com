import type { TrpcSessionUser } from "../../../trpc";
import type { TSetDefaultConferencingAppSchema } from "./setDefaultConferencingApp.schema";
type SetDefaultConferencingAppOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TSetDefaultConferencingAppSchema;
};
export declare const setDefaultConferencingAppHandler: ({ ctx, input }: SetDefaultConferencingAppOptions) => Promise<void>;
export {};
