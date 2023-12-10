import { z } from "zod";

import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { ZListMembersSchema } from "./listPaginated.schema";
import { ZAdminLockUserAccountSchema } from "./lockUserAccount.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";

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
});
