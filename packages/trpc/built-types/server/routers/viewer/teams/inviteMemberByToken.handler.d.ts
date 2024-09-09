import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";
type InviteMemberByTokenOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TInviteMemberByTokenSchemaInputSchema;
};
export declare const inviteMemberByTokenHandler: ({ ctx, input }: InviteMemberByTokenOptions) => Promise<string>;
export default inviteMemberByTokenHandler;
