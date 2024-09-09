import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { THasEditPermissionForUserSchema } from "./hasEditPermissionForUser.schema";
type HasEditPermissionForUserOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: THasEditPermissionForUserSchema;
};
export declare const hasEditPermissionForUser: ({ ctx, input }: HasEditPermissionForUserOptions) => Promise<boolean>;
export default hasEditPermissionForUser;
