import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { importHandler } from "../../../trpc";
import { ZAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

export const toggleFeatureFlag = authedAdminProcedure
  .input(ZAdminToggleFeatureFlagSchema)
  .mutation(async (opts) => {
    const handler = await importHandler(
      "admin.toggleFeatureFlag",
      () => import("./toggleFeatureFlag.handler")
    );
    return handler(opts);
  });
