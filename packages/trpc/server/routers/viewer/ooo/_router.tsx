import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZEnableOOOSyncSchema } from "./oooGoogleCalendarSync.schema";
import { ZOutOfOfficeInputSchema } from "./outOfOfficeCreateOrUpdate.schema";
import { ZOutOfOfficeEntriesListSchema } from "./outOfOfficeEntriesList.schema";
import { ZOutOfOfficeDelete } from "./outOfOfficeEntryDelete.schema";

export const oooRouter = router({
  outOfOfficeCreateOrUpdate: authedProcedure
    .input(ZOutOfOfficeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = (await import("./outOfOfficeCreateOrUpdate.handler")).outOfOfficeCreateOrUpdate;
      return handler({ ctx, input });
    }),
  outOfOfficeEntryDelete: authedProcedure.input(ZOutOfOfficeDelete).mutation(async ({ ctx, input }) => {
    const handler = (await import("./outOfOfficeEntryDelete.handler")).outOfOfficeEntryDelete;
    return handler({ ctx, input });
  }),
  outOfOfficeEntriesList: authedProcedure.input(ZOutOfOfficeEntriesListSchema).query(async (opts) => {
    const handler = (await import("./outOfOfficeEntriesList.handler")).outOfOfficeEntriesList;
    return handler(opts);
  }),
  outOfOfficeReasonList: authedProcedure.query(async () => {
    const handler = (await import("./outOfOfficeReasons.handler")).outOfOfficeReasonList;
    return handler();
  }),

  // Google Calendar OOO sync endpoints
  getOOOSyncStatus: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./oooGoogleCalendarSync.handler")).getOOOSyncStatus;
    return handler({ ctx });
  }),
  enableGoogleCalendarOOOSync: authedProcedure
    .input(ZEnableOOOSyncSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = (await import("./oooGoogleCalendarSync.handler")).enableGoogleCalendarOOOSync;
      return handler({ ctx, input });
    }),
  triggerOOOSync: authedProcedure.mutation(async ({ ctx }) => {
    const handler = (await import("./oooGoogleCalendarSync.handler")).triggerOOOSync;
    return handler({ ctx });
  }),
});
