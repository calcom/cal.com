import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TUpdateUserInputSchema } from "./updateUser.schema";
type UpdateUserOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateUserInputSchema;
};
export declare const updateUserHandler: ({ ctx, input }: UpdateUserOptions) => Promise<{
    success: boolean;
}>;
export default updateUserHandler;
