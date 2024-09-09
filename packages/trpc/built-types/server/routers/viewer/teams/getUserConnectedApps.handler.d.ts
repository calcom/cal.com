import type { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetUserConnectedAppsInputSchema } from "./getUserConnectedApps.schema";
type GetUserConnectedAppsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetUserConnectedAppsInputSchema;
};
type Apps = {
    name: string | null;
    logo: string | null;
    externalId: string | null;
    app: {
        slug: string;
        categories: AppCategories[];
    } | null;
};
export declare const getUserConnectedAppsHandler: ({ ctx, input }: GetUserConnectedAppsOptions) => Promise<Record<number, Apps[]>>;
export default getUserConnectedAppsHandler;
