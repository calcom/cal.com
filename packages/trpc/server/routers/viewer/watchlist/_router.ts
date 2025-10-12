import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateWatchlistEntrySchema } from "./create.schema";
import { ZCreateForOrganizationSchema } from "./createForOrganization.schema";
import { ZDeleteWatchlistEntrySchema } from "./delete.schema";
import { ZDeleteForOrganizationSchema } from "./deleteForOrganization.schema";
import { ZListAllWatchlistSchema } from "./listAll.schema";
import { ZListByOrganizationSchema } from "./listByOrganization.schema";
import { ZUpdateWatchlistEntrySchema } from "./update.schema";

export const watchlistRouter = router({
  // ============ System Admin Endpoints ============
  admin: router({
    listAll: authedAdminProcedure.input(ZListAllWatchlistSchema).query(async (opts) => {
      const { default: handler } = await import("./listAll.handler");
      return handler(opts);
    }),

    create: authedAdminProcedure.input(ZCreateWatchlistEntrySchema).mutation(async (opts) => {
      const { default: handler } = await import("./create.handler");
      return handler(opts);
    }),

    update: authedAdminProcedure.input(ZUpdateWatchlistEntrySchema).mutation(async (opts) => {
      const { default: handler } = await import("./update.handler");
      return handler(opts);
    }),

    delete: authedAdminProcedure.input(ZDeleteWatchlistEntrySchema).mutation(async (opts) => {
      const { default: handler } = await import("./delete.handler");
      return handler(opts);
    }),
  }),

  // ============ Organization Admin Endpoints ============
  organization: router({
    list: authedProcedure.input(ZListByOrganizationSchema).query(async (opts) => {
      const { default: handler } = await import("./listByOrganization.handler");
      return handler(opts);
    }),

    create: authedProcedure.input(ZCreateForOrganizationSchema).mutation(async (opts) => {
      const { default: handler } = await import("./createForOrganization.handler");
      return handler(opts);
    }),

    delete: authedProcedure.input(ZDeleteForOrganizationSchema).mutation(async (opts) => {
      const { default: handler } = await import("./deleteForOrganization.handler");
      return handler(opts);
    }),
  }),
});
