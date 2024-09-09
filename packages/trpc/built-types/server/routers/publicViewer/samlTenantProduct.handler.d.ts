import type { PrismaClient } from "@calcom/prisma";
import type { TSamlTenantProductInputSchema } from "./samlTenantProduct.schema";
type SamlTenantProductOptions = {
    ctx: {
        prisma: PrismaClient;
    };
    input: TSamlTenantProductInputSchema;
};
export declare const samlTenantProductHandler: ({ ctx, input }: SamlTenantProductOptions) => Promise<{
    tenant: string;
    product: string;
}>;
export default samlTenantProductHandler;
