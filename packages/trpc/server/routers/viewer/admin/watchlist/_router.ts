import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZAddToWatchlistInputSchema } from "./addToWatchlist.schema";
import { ZBulkDeleteWatchlistEntriesInputSchema } from "./bulkDelete.schema";
import { ZBulkDismissReportsInputSchema } from "./bulkDismiss.schema";
import { ZCreateWatchlistEntryInputSchema } from "./create.schema";
import { ZDeleteWatchlistEntryInputSchema } from "./delete.schema";
import { ZDismissReportInputSchema } from "./dismissReport.schema";
import { ZGetWatchlistEntryDetailsInputSchema } from "./getDetails.schema";
import { ZListWatchlistEntriesInputSchema } from "./list.schema";
import { ZListReportsInputSchema } from "./listReports.schema";

export const watchlistRouter = router({
  list: authedAdminProcedure.input(ZListWatchlistEntriesInputSchema).query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),
  create: authedAdminProcedure.input(ZCreateWatchlistEntryInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./create.handler");
    return handler(opts);
  }),
  delete: authedAdminProcedure.input(ZDeleteWatchlistEntryInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./delete.handler");
    return handler(opts);
  }),
  bulkDelete: authedAdminProcedure
    .input(ZBulkDeleteWatchlistEntriesInputSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./bulkDelete.handler");
      return handler(opts);
    }),
  getDetails: authedAdminProcedure.input(ZGetWatchlistEntryDetailsInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getDetails.handler");
    return handler(opts);
  }),
  // Report management endpoints
  listReports: authedAdminProcedure.input(ZListReportsInputSchema).query(async (opts) => {
    const { default: handler } = await import("./listReports.handler");
    return handler(opts);
  }),
  dismissReport: authedAdminProcedure.input(ZDismissReportInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./dismissReport.handler");
    return handler(opts);
  }),
  bulkDismiss: authedAdminProcedure.input(ZBulkDismissReportsInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./bulkDismiss.handler");
    return handler(opts);
  }),
  addToWatchlist: authedAdminProcedure.input(ZAddToWatchlistInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./addToWatchlist.handler");
    return handler(opts);
  }),
  pendingReportsCount: authedAdminProcedure.query(async () => {
    const { default: handler } = await import("./pendingReportsCount.handler");
    return handler();
  }),
});
