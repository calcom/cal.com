import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";

type AppCredentialsByTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAppCredentialsByTypeInputSchema;
};

export const appCredentialsByTypeHandler = async ({ ctx, input }: AppCredentialsByTypeOptions) => {
  const { user } = ctx;
  return user.credentials.filter((app) => app.type == input.appType).map((credential) => credential.id);
};
