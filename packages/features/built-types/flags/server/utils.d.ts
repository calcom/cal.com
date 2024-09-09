import type { PrismaClient } from "@calcom/prisma";
import type { AppFlags } from "../config";
export declare function getFeatureFlagMap(prisma: PrismaClient): Promise<Partial<AppFlags>>;
interface CacheOptions {
    ttl: number;
}
export declare const getFeatureFlag: (prisma: PrismaClient, slug: keyof AppFlags, options?: CacheOptions) => Promise<boolean>;
export {};
//# sourceMappingURL=utils.d.ts.map