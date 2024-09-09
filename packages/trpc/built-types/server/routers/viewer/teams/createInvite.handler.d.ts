import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TCreateInviteInputSchema } from "./createInvite.schema";
type CreateInviteOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCreateInviteInputSchema;
};
export declare const createInviteHandler: ({ ctx, input }: CreateInviteOptions) => Promise<{
    token: string;
    inviteLink: string;
}>;
export default createInviteHandler;
