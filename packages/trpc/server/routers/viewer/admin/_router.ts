import { z } from "zod";

import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { ZListMembersSchema } from "./listPaginated.schema";
import { ZAdminLockUserAccountSchema } from "./lockUserAccount.schema";
import { ZAdminRemoveTwoFactor } from "./removeTwoFactor.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";
import { ZSetSMSLockState } from "./setSMSLockState.schema";

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
  toggleFeatureFlag: authedAdminProcedure
    .input(z.object({ slug: z.string(), enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      const { prisma, user } = ctx;
      const { slug, enabled } = input;
      return prisma.feature.update({
        where: { slug },
        data: { enabled, updatedBy: user.id },
      });
    }),
  removeTwoFactor: authedAdminProcedure.input(ZAdminRemoveTwoFactor).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("removeTwoFactor"),
      () => import("./removeTwoFactor.handler")
    );
    return handler(opts);
  }),
  getSMSLockStateTeamsUsers: authedAdminProcedure.query(async (opts) => {
    const handler = await importHandler(
      namespaced("getSMSLockStateTeamsUsers"),
      () => import("./getSMSLockStateTeamsUsers.handler")
    );
    return handler(opts);
  }),
  setSMSLockState: authedAdminProcedure.input(ZSetSMSLockState).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("setSMSLockState"),
      () => import("./setSMSLockState.handler")
    );
    return handler(opts);
  }),
});
