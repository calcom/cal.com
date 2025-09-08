import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZOutOfOfficeEntriesListSchema } from "./outOfOfficeEntriesList.schema";

export const oooQueriesRouter = router({
  outOfOfficeEntriesList: authedProcedure.input(ZOutOfOfficeEntriesListSchema).query(async (opts) => {
    const { outOfOfficeEntriesList } = await import("./outOfOfficeEntriesList.handler");
    return outOfOfficeEntriesList(opts);
  }),

  outOfOfficeReasonList: authedProcedure.query(async () => {
    const { outOfOfficeReasonList } = await import("./outOfOfficeReasons.handler");
    return outOfOfficeReasonList();
  }),
});
