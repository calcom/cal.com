import setDefaultConferencingApp from "@calcom/app-store/_utils/setDefaultConferencingApp";

import type { TrpcSessionUser } from "../../../trpc";
import type { TSetDefaultConferencingAppSchema } from "./setDefaultConferencingApp.schema";

type SetDefaultConferencingAppOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetDefaultConferencingAppSchema;
};

export const setDefaultConferencingAppHandler = async ({ ctx, input }: SetDefaultConferencingAppOptions) => {
  return await setDefaultConferencingApp(ctx.user.id, input.slug);
};
