import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TIntegrationsInputSchema } from "./integrations.schema";

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

export const integrationsHandler = async ({ ctx, input }: IntegrationsOptions) => {
  const { user } = ctx;
  const { variant, exclude, onlyInstalled } = input;
  const { credentials } = user;

  const enabledApps = await getEnabledApps(credentials);
  //TODO: Refactor this to pick up only needed fields and prevent more leaking
  let apps = enabledApps.map(
    ({ credentials: _, credential: _1, key: _2 /* don't leak to frontend */, ...app }) => {
      const credentialIds = credentials.filter((c) => c.type === app.type).map((c) => c.id);
      const invalidCredentialIds = credentials
        .filter((c) => c.type === app.type && c.invalid)
        .map((c) => c.id);
      return {
        ...app,
        credentialIds,
        invalidCredentialIds,
      };
    }
  );

  if (variant) {
    // `flatMap()` these work like `.filter()` but infers the types correctly
    apps = apps
      // variant check
      .flatMap((item) => (item.variant.startsWith(variant) ? [item] : []));
  }

  if (exclude) {
    // exclusion filter
    apps = apps.filter((item) => (exclude ? !exclude.includes(item.variant) : true));
  }

  if (onlyInstalled) {
    apps = apps.flatMap((item) => (item.credentialIds.length > 0 || item.isGlobal ? [item] : []));
  }
  return {
    items: apps,
  };
};
