import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
type ChangeMemberRoleOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TChangeMemberRoleInputSchema;
};
export declare const changeMemberRoleHandler: ({ ctx, input }: ChangeMemberRoleOptions) => Promise<void>;
export default changeMemberRoleHandler;
