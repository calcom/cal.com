import { z } from "zod";

import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZDeleteFormInputSchema } from "./deleteForm.schema";
import { ZFormMutationInputSchema } from "./formMutation.schema";
import { ZFormQueryInputSchema } from "./formQuery.schema";
import { ZGetAttributesForTeamInputSchema } from "./getAttributesForTeam.schema";
import { forms } from "./procedures/forms";
import { ZReportInputSchema } from "./report.schema";
import { ZResponseInputSchema } from "./response.schema";

// eslint-disable-next-line @typescript-eslint/ban-types
const UNSTABLE_HANDLER_CACHE: Record<string, Function> = {};

// TODO: Move getHandler and UNSTABLE_HANDLER_CACHE to a common utils file making sure that there is no name collision across routes
/**
 * This function will import the module defined in importer just once and then cache the default export of that module.
 *
 * It gives you the default export of the module.
 *
 * **Note: It is your job to ensure that the name provided is unique across all routes.**
 */
const getHandler = async <
  T extends {
    // eslint-disable-next-line @typescript-eslint/ban-types
    default: Function;
  }
>(
  /**
   * The name of the handler in cache. It has to be unique across all routes
   */
  name: string,
  importer: () => Promise<T>
) => {
  const nameInCache = name as keyof typeof UNSTABLE_HANDLER_CACHE;

  if (!UNSTABLE_HANDLER_CACHE[nameInCache]) {
    const importedModule = await importer();
    UNSTABLE_HANDLER_CACHE[nameInCache] = importedModule.default;
    return importedModule.default as T["default"];
  }

  return UNSTABLE_HANDLER_CACHE[nameInCache] as unknown as T["default"];
};

export const ZFormByResponseIdInputSchema = z.object({
  formResponseId: z.number(),
});

export type TFormQueryInputSchema = z.infer<typeof ZFormQueryInputSchema>;

const appRoutingForms = router({
  public: router({
    response: publicProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
      const handler = await getHandler("response", () => import("./response.handler"));
      return handler({ ctx, input });
    }),
  }),
  forms,
  formQuery: authedProcedure.input(ZFormQueryInputSchema).query(async ({ ctx, input }) => {
    const handler = await getHandler("formQuery", () => import("./formQuery.handler"));
    return handler({ ctx, input });
  }),
  getResponseWithFormFields: authedProcedure
    .input(ZFormByResponseIdInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await getHandler(
        "getResponseWithFormFields",
        () => import("./getResponseWithFormFields.handler")
      );
      return handler({ ctx, input });
    }),
  formMutation: authedProcedure.input(ZFormMutationInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await getHandler("formMutation", () => import("./formMutation.handler"));
    return handler({ ctx, input });
  }),
  deleteForm: authedProcedure.input(ZDeleteFormInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await getHandler("deleteForm", () => import("./deleteForm.handler"));
    return handler({ ctx, input });
  }),

  report: authedProcedure.input(ZReportInputSchema).query(async ({ ctx, input }) => {
    const handler = await getHandler("report", () => import("./report.handler"));
    return handler({ ctx, input });
  }),

  getAttributesForTeam: authedProcedure
    .input(ZGetAttributesForTeamInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await getHandler(
        "getAttributesForTeam",
        () => import("./getAttributesForTeam.handler")
      );
      return handler({ ctx, input });
    }),
});

export default appRoutingForms;
