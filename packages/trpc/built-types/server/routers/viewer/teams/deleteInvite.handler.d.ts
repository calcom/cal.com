import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TDeleteInviteInputSchema } from "./deleteInvite.schema";
type DeleteInviteOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TDeleteInviteInputSchema;
};
export declare const deleteInviteHandler: ({ ctx, input }: DeleteInviteOptions) => Promise<void>;
export default deleteInviteHandler;
