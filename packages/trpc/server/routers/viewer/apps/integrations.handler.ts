import { getConnectedApps } from "@calcom/lib/getConnectedApps";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TIntegrationsInputSchema } from "./integrations.schema";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const user = ctx.user;
  return getConnectedApps({ user, input, prisma });
};
