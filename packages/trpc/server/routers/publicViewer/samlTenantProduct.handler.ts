import type { Session } from "next-auth";

import { samlTenantProduct } from "@calcom/features/ee/sso/lib/saml";
import { prisma } from "@calcom/prisma";

import type { TSamlTenantProductInputSchema } from "./samlTenantProduct.schema";

type SamlTenantProductOptions = {
  ctx: {
    session: Session | null;
  };
  input: TSamlTenantProductInputSchema;
};

export const samlTenantProductHandler = async ({ ctx: _ctx, input }: SamlTenantProductOptions) => {
  const { email } = input;

  return await samlTenantProduct(prisma, email);
};
