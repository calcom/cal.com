import type { PrismaClient } from "@calcom/prisma";
export declare const ssoTenantProduct: (prisma: PrismaClient, email: string) => Promise<{
    tenant: string;
    product: string;
}>;
//# sourceMappingURL=sso.d.ts.map