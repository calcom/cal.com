import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { ZAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

export const toggleFeatureFlag = authedAdminProcedure
  .input(ZAdminToggleFeatureFlagSchema)
  .mutation(async (opts) => {
    const handler = await import("./toggleFeatureFlag.handler");
    return handler.default(opts);
  });
