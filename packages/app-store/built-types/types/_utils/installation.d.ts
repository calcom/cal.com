import type { Prisma } from "@prisma/client";
import type { UserProfile } from "@calcom/types/UserProfile";
export declare function checkInstalled(slug: string, userId: number): Promise<void>;
type InstallationArgs = {
    appType: string;
    user: {
        id: number;
        profile?: UserProfile;
    };
    slug: string;
    key?: Prisma.InputJsonValue;
    teamId?: number;
    subscriptionId?: string | null;
    paymentStatus?: string | null;
    billingCycleStart?: number | null;
};
export declare function createDefaultInstallation({ appType, user, slug, key, teamId, billingCycleStart, paymentStatus, subscriptionId, }: InstallationArgs): Promise<{
    type: string;
    id: number;
    invalid: boolean | null;
    key: Prisma.JsonValue;
    userId: number | null;
    teamId: number | null;
    subscriptionId: string | null;
    billingCycleStart: number | null;
    appId: string | null;
    paymentStatus: string | null;
}>;
export {};
//# sourceMappingURL=installation.d.ts.map