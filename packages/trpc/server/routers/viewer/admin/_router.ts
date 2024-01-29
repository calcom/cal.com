import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { importHandler, router } from "../../../trpc";
import { ZListMembersSchema } from "./listPaginated.schema";
import { ZAdminLockUserAccountSchema } from "./lockUserAccount.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";
import { toggleFeatureFlag } from "./toggleFeatureFlag.procedure";

const NAMESPACE = "admin";

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
  lockUserAccount: authedAdminProcedure.input(ZAdminLockUserAccountSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("lockUserAccount"),
      () => import("./lockUserAccount.handler")
    );
    return handler(opts);
  }),
  toggleFeatureFlag,
});
