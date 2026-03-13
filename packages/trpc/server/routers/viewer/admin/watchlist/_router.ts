import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { createSystemPbacProcedure } from "../../../../procedures/pbacProcedures";
import { router } from "../../../../trpc";
import { ZAddToWatchlistInputSchema } from "./addToWatchlist.schema";
import { ZBulkDeleteWatchlistEntriesInputSchema } from "./bulkDelete.schema";
import { ZBulkDismissReportsInputSchema } from "./bulkDismiss.schema";
import { ZCreateWatchlistEntryInputSchema } from "./create.schema";
import { ZDeleteWatchlistEntryInputSchema } from "./delete.schema";
import { ZDismissReportInputSchema } from "./dismissReport.schema";
import { ZGetWatchlistEntryDetailsInputSchema } from "./getDetails.schema";
import { ZGetEntryImpactInputSchema } from "./getEntryImpact.schema";
import { ZListWatchlistEntriesInputSchema } from "./list.schema";
import { ZListReportsInputSchema } from "./listReports.schema";

export const watchlistRouter = router({
  list: createSystemPbacProcedure("watchlist.read")
    .input(ZListWatchlistEntriesInputSchema)
    .query(async (opts) => {
      const { listWatchlistEntriesHandler: handler } = await import("./list.handler");
      return handler(opts);
    }),
  create: createSystemPbacProcedure("watchlist.create")
    .input(ZCreateWatchlistEntryInputSchema)
    .mutation(async (opts) => {
      const { createWatchlistEntryHandler: handler } = await import("./create.handler");
      return handler(opts);
    }),
  delete: createSystemPbacProcedure("watchlist.delete")
    .input(ZDeleteWatchlistEntryInputSchema)
    .mutation(async (opts) => {
      const { deleteWatchlistEntryHandler: handler } = await import("./delete.handler");
      return handler(opts);
    }),
  bulkDelete: createSystemPbacProcedure("watchlist.delete")
    .input(ZBulkDeleteWatchlistEntriesInputSchema)
    .mutation(async (opts) => {
      const { bulkDeleteWatchlistEntriesHandler: handler } = await import("./bulkDelete.handler");
      return handler(opts);
    }),
  getDetails: createSystemPbacProcedure("watchlist.read")
    .input(ZGetWatchlistEntryDetailsInputSchema)
    .query(async (opts) => {
      const { getWatchlistEntryDetailsHandler: handler } = await import("./getDetails.handler");
      return handler(opts);
    }),
  listReports: createSystemPbacProcedure("watchlist.read")
    .input(ZListReportsInputSchema)
    .query(async (opts) => {
      const { listReportsHandler: handler } = await import("./listReports.handler");
      return handler(opts);
    }),
  dismissReport: createSystemPbacProcedure("watchlist.update")
    .input(ZDismissReportInputSchema)
    .mutation(async (opts) => {
      const { dismissReportHandler: handler } = await import("./dismissReport.handler");
      return handler(opts);
    }),
  bulkDismiss: createSystemPbacProcedure("watchlist.update")
    .input(ZBulkDismissReportsInputSchema)
    .mutation(async (opts) => {
      const { bulkDismissReportsHandler: handler } = await import("./bulkDismiss.handler");
      return handler(opts);
    }),
  addToWatchlist: createSystemPbacProcedure("watchlist.create")
    .input(ZAddToWatchlistInputSchema)
    .mutation(async (opts) => {
      const { addToWatchlistHandler: handler } = await import("./addToWatchlist.handler");
      return handler(opts);
    }),
  getEntryImpact: createSystemPbacProcedure("watchlist.read")
    .input(ZGetEntryImpactInputSchema)
    .query(async (opts) => {
      const { getEntryImpactHandler: handler } = await import("./getEntryImpact.handler");
      return handler(opts);
    }),
  pendingReportsCount: createSystemPbacProcedure("watchlist.read").query(async () => {
    const { pendingReportsCountHandler: handler } = await import("./pendingReportsCount.handler");
    return handler();
  }),
  getSystemWatchlistPermissions: authedAdminProcedure.query(async (opts) => {
    const { getSystemWatchlistPermissionsHandler: handler } = await import(
      "./getSystemWatchlistPermissions.handler"
    );
    return handler(opts);
  }),
});
