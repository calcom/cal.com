import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TUpdateUserDefaultConferencingAppInputSchema } from "./updateUserDefaultConferencingApp.schema";
type UpdateUserDefaultConferencingAppOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateUserDefaultConferencingAppInputSchema;
};
export declare const updateUserDefaultConferencingAppHandler: ({ ctx, input, }: UpdateUserDefaultConferencingAppOptions) => Promise<{
    appSlug?: string | undefined;
    appLink?: string | undefined;
}>;
export {};
