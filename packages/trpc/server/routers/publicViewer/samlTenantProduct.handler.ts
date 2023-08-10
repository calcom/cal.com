import { samlTenantProduct } from "@calcom/features/ee/sso/lib/saml";
import type { PrismaType } from "@calcom/prisma";

import type { TSamlTenantProductInputSchema } from "./samlTenantProduct.schema";

type SamlTenantProductOptions = {
  ctx: {
    prisma: PrismaType;
  };
  input: TSamlTenantProductInputSchema;
};

export const samlTenantProductHandler = ({ ctx, input }: SamlTenantProductOptions) => {
  const { prisma } = ctx;
  const { email } = input;

  return samlTenantProduct(prisma, email);
};
