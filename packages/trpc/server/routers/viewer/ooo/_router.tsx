import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZOutOfOfficeInputSchema } from "./outOfOfficeCreateOrUpdate.schema";
import { ZCreateCustomReasonSchema } from "./outOfOfficeCreateReason.schema";
import { ZDeleteCustomReasonSchema } from "./outOfOfficeDeleteReason.schema";
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
  outOfOfficeReasonList: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./outOfOfficeReasons.handler")).outOfOfficeReasonList;
    return handler({ ctx });
  }),
  outOfOfficeCreateReason: authedProcedure
    .input(ZCreateCustomReasonSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = (await import("./outOfOfficeCreateReason.handler")).outOfOfficeCreateReason;
      return handler({ ctx, input });
    }),
  outOfOfficeDeleteReason: authedProcedure
    .input(ZDeleteCustomReasonSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = (await import("./outOfOfficeDeleteReason.handler")).outOfOfficeDeleteReason;
      return handler({ ctx, input });
    }),
});
