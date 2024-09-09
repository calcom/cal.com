import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TRoutingFormOrderInputSchema } from "./routingFormOrder.schema";
type RoutingFormOrderOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TRoutingFormOrderInputSchema;
};
export declare const routingFormOrderHandler: ({ ctx, input }: RoutingFormOrderOptions) => Promise<void>;
export {};
