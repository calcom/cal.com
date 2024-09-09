import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";
type SetInviteExpirationOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TSetInviteExpirationInputSchema;
};
export declare const setInviteExpirationHandler: ({ ctx, input }: SetInviteExpirationOptions) => Promise<void>;
export default setInviteExpirationHandler;
