import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TConnectAndJoinInputSchema } from "./connectAndJoin.schema";
type Options = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TConnectAndJoinInputSchema;
};
export declare const Handler: ({ ctx, input }: Options) => Promise<{
    isBookingAlreadyAcceptedBySomeoneElse: boolean;
    meetingUrl: string;
}>;
export {};
