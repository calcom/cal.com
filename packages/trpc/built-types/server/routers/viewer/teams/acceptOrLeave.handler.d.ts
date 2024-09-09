import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
type AcceptOrLeaveOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAcceptOrLeaveInputSchema;
};
export declare const acceptOrLeaveHandler: ({ ctx, input }: AcceptOrLeaveOptions) => Promise<void>;
export default acceptOrLeaveHandler;
