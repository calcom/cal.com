import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZOutOfOfficeInputSchema } from "./outOfOfficeCreateOrUpdate.schema";
import { ZOutOfOfficeEntriesListSchema } from "./outOfOfficeEntriesList.schema";
import { ZOutOfOfficeCustomReasonCreateSchema } from "./outOfOfficeCustomReasonCreate.schema";
import { ZOutOfOfficeCustomReasonDeleteSchema } from "./outOfOfficeCustomReasonDelete.schema";
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
  outOfOfficeReasonList: authedProcedure.query(async (opts) => {
    const handler = (await import("./outOfOfficeReasons.handler")).outOfOfficeReasonList;
    return handler(opts);
  }),
  outOfOfficeReasonIdsInUse: authedProcedure.query(async (opts) => {
    const handler = (await import("./outOfOfficeReasonIdsInUse.handler")).outOfOfficeReasonIdsInUse;
    return handler(opts);
  }),
  outOfOfficeCustomReasonCreate: authedProcedure
    .input(ZOutOfOfficeCustomReasonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = (await import("./outOfOfficeCustomReasonCreate.handler")).outOfOfficeCustomReasonCreate;
      return handler({ ctx, input });
    }),
  outOfOfficeCustomReasonDelete: authedProcedure
    .input(ZOutOfOfficeCustomReasonDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = (await import("./outOfOfficeCustomReasonDelete.handler")).outOfOfficeCustomReasonDelete;
      return handler({ ctx, input });
    }),
});
