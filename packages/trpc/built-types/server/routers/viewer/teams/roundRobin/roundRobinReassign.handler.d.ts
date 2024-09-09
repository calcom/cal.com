import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";
type RoundRobinReassignOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TRoundRobinReassignInputSchema;
};
export declare const roundRobinReassignHandler: ({ ctx, input }: RoundRobinReassignOptions) => Promise<void>;
export default roundRobinReassignHandler;
