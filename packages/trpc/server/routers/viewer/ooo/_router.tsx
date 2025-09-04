import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZOutOfOfficeEntriesListSchema } from "./outOfOfficeEntriesList.schema";
import { ZOutOfOfficeDelete } from "./outOfOfficeEntryDelete.schema";

export const oooRouter = router({
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
});
