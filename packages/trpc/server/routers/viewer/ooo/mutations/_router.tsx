import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZOutOfOfficeInputSchema } from "./outOfOfficeCreateOrUpdate.schema";
import { ZOutOfOfficeDelete } from "./outOfOfficeEntryDelete.schema";

export const oooRouter = router({
  outOfOfficeCreateOrUpdate: authedProcedure
    .input(ZOutOfOfficeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { outOfOfficeCreateOrUpdate } = await import("./outOfOfficeCreateOrUpdate.handler");
      return outOfOfficeCreateOrUpdate({ ctx, input });
    }),

  outOfOfficeEntryDelete: authedProcedure.input(ZOutOfOfficeDelete).mutation(async ({ ctx, input }) => {
    const { outOfOfficeEntryDelete } = await import("./outOfOfficeEntryDelete.handler");
    return outOfOfficeEntryDelete({ ctx, input });
  }),
});
