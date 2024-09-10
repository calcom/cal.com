import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";
type AppCredentialsByTypeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAppCredentialsByTypeInputSchema;
};
/** Used for grabbing credentials on specific app pages */
export declare const appCredentialsByTypeHandler: ({ ctx, input }: AppCredentialsByTypeOptions) => Promise<{
    credentials: {
        type: string;
        id: number;
        userId: number | null;
        teamId: number | null;
        subscriptionId: string | null;
        appId: string | null;
        key: import(".prisma/client").Prisma.JsonValue;
        paymentStatus: string | null;
        billingCycleStart: number | null;
        invalid: boolean | null;
    }[];
    userAdminTeams: number[];
}>;
export {};
