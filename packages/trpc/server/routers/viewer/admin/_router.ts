import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { importHandler, router } from "../../../trpc";
import { ZListMembersSchema } from "./listPaginated.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";
import { ZAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

const NAMESPACE = "adminRouter";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const adminRouter = router({
  listPaginated: authedAdminProcedure.input(ZListMembersSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("listPaginated"), () => import("./listPaginated.handler"));
    return handler(opts);
  }),
  sendPasswordReset: authedAdminProcedure.input(ZAdminPasswordResetSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("sendPasswordReset"),
      () => import("./sendPasswordReset.handler")
    );
    return handler(opts);
  }),
  toggleFeatureFlag: authedAdminProcedure.input(ZAdminToggleFeatureFlagSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("toggleFeatureFlag"),
      () => import("./toggleFeatureFlag.handler")
    );
    return handler(opts);
  }),
});
