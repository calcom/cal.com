import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZDeleteFormInputSchema } from "./deleteForm.schema";
import { ZFormMutationInputSchema } from "./formMutation.schema";
import { ZFormQueryInputSchema } from "./formQuery.schema";
import { ZReportInputSchema } from "./report.schema";
import { ZResponseInputSchema } from "./response.schema";

const appRoutingForms = router({
  public: router({
    response: publicProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
      const handler = await import("./response.handler");
      return handler.responseHandler({ ctx, input });
    }),
  }),
  forms: authedProcedure.query(async ({ ctx }) => {
    const handler = await import("./forms.handler");
    return handler.formsHandler({ ctx });
  }),
  formQuery: authedProcedure.input(ZFormQueryInputSchema).query(async ({ ctx, input }) => {
    const handler = await import("./formQuery.handler");
    return handler.formQueryHandler({ ctx, input });
  }),
  formMutation: authedProcedure.input(ZFormMutationInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await import("./formMutation.handler");
    return handler.formMutationHandler({ ctx, input });
  }),
  deleteForm: authedProcedure.input(ZDeleteFormInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await import("./deleteForm.handler");
    return handler.deleteFormHandler({ ctx, input });
  }),

  report: authedProcedure.input(ZReportInputSchema).query(async ({ ctx, input }) => {
    const handler = await import("./report.handler");
    return handler.reportHandler({ ctx, input });
  }),
});

export default appRoutingForms;
