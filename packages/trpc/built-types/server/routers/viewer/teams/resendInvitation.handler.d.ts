import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TResendInvitationInputSchema } from "./resendInvitation.schema";
type InviteMemberOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TResendInvitationInputSchema;
};
export declare const resendInvitationHandler: ({ ctx, input }: InviteMemberOptions) => Promise<{
    email: string;
    teamId: number;
    language: string;
    isOrg: boolean;
}>;
export default resendInvitationHandler;
