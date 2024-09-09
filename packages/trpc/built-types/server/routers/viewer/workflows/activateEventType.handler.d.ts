import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TActivateEventTypeInputSchema } from "./activateEventType.schema";
type ActivateEventTypeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TActivateEventTypeInputSchema;
};
export declare const activateEventTypeHandler: ({ ctx, input }: ActivateEventTypeOptions) => Promise<void>;
export {};
