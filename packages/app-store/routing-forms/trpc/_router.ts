import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZDeleteFormInputSchema } from "./deleteForm.schema";
import { ZFormMutationInputSchema } from "./formMutation.schema";
import { ZFormQueryInputSchema } from "./formQuery.schema";
import { ZReportInputSchema } from "./report.schema";
import { ZResponseInputSchema } from "./response.schema";

interface AppRoutingFormsRouteshandlerCache {
  response?: typeof import("./response.handler").responseHandler;
  forms?: typeof import("./forms.handler").formsHandler;
  formQuery?: typeof import("./formQuery.handler").formQueryHandler;
  formMutation?: typeof import("./formMutation.handler").formMutationHandler;
  deleteForm?: typeof import("./deleteForm.handler").deleteFormHandler;
  report?: typeof import("./report.handler").reportHandler;
}

const UNSTABLE_HANDLER_CACHE: AppRoutingFormsRouteshandlerCache = {};

const appRoutingForms = router({
  public: router({
    response: publicProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.response) {
        UNSTABLE_HANDLER_CACHE.response = (await import("./response.handler")).responseHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.response) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.response({ ctx, input });
    }),
  }),
  forms: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.forms) {
      UNSTABLE_HANDLER_CACHE.forms = (await import("./forms.handler")).formsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.forms) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.forms({ ctx });
  }),
  formQuery: authedProcedure.input(ZFormQueryInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.formQuery) {
      UNSTABLE_HANDLER_CACHE.formQuery = (await import("./formQuery.handler")).formQueryHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.formQuery) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.formQuery({ ctx, input });
  }),
  formMutation: authedProcedure.input(ZFormMutationInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.formMutation) {
      UNSTABLE_HANDLER_CACHE.formMutation = (await import("./formMutation.handler")).formMutationHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.formMutation) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.formMutation({ ctx, input });
  }),
  deleteForm: authedProcedure.input(ZDeleteFormInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteForm) {
      UNSTABLE_HANDLER_CACHE.deleteForm = (await import("./deleteForm.handler")).deleteFormHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.deleteForm) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteForm({ ctx, input });
  }),

  report: authedProcedure.input(ZReportInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.report) {
      UNSTABLE_HANDLER_CACHE.report = (await import("./report.handler")).reportHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.report) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.report({ ctx, input });
  }),
});

export default appRoutingForms;
