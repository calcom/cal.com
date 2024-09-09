import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TEventTypeOrderInputSchema } from "./eventTypeOrder.schema";
type EventTypeOrderOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TEventTypeOrderInputSchema;
};
export declare const eventTypeOrderHandler: ({ ctx, input }: EventTypeOrderOptions) => Promise<void>;
export {};
