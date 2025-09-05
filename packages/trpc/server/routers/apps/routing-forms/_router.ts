import { z } from "zod";

import { ZDeleteFormInputSchema } from "@calcom/app-store/routing-forms/trpc/deleteForm.schema";
import { ZFormMutationInputSchema } from "@calcom/app-store/routing-forms/trpc/formMutation.schema";
import { ZFormQueryInputSchema } from "@calcom/app-store/routing-forms/trpc/formQuery.schema";
import { ZGetAttributesForTeamInputSchema } from "@calcom/app-store/routing-forms/trpc/getAttributesForTeam.schema";
import { ZGetIncompleteBookingSettingsInputSchema } from "@calcom/app-store/routing-forms/trpc/getIncompleteBookingSettings.schema";
import { ZSaveIncompleteBookingSettingsInputSchema } from "@calcom/app-store/routing-forms/trpc/saveIncompleteBookingSettings.schema";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { forms } from "./procedures/forms";

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
  forms,
  formQuery: authedProcedure.input(ZFormQueryInputSchema).query(async ({ ctx, input }) => {
    const handler = await getHandler(
      "formQuery",
      () => import("@calcom/app-store/routing-forms/trpc/formQuery.handler")
    );
    return handler({ ctx, input });
  }),
  getResponseWithFormFields: authedProcedure
    .input(ZFormByResponseIdInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await getHandler(
        "getResponseWithFormFields",
        () => import("@calcom/app-store/routing-forms/trpc/getResponseWithFormFields.handler")
      );
      return handler({ ctx, input });
    }),
  formMutation: authedProcedure.input(ZFormMutationInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await getHandler(
      "formMutation",
      () => import("@calcom/app-store/routing-forms/trpc/formMutation.handler")
    );
    return handler({ ctx, input });
  }),
  deleteForm: authedProcedure.input(ZDeleteFormInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await getHandler(
      "deleteForm",
      () => import("@calcom/app-store/routing-forms/trpc/deleteForm.handler")
    );
    return handler({ ctx, input });
  }),

  getAttributesForTeam: authedProcedure
    .input(ZGetAttributesForTeamInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await getHandler(
        "getAttributesForTeam",
        () => import("@calcom/app-store/routing-forms/trpc/getAttributesForTeam.handler")
      );
      return handler({ ctx, input });
    }),

  getIncompleteBookingSettings: authedProcedure
    .input(ZGetIncompleteBookingSettingsInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await getHandler(
        "getIncompleteBookingSettings",
        () => import("@calcom/app-store/routing-forms/trpc/getIncompleteBookingSettings.handler")
      );
      return handler({ ctx, input });
    }),

  saveIncompleteBookingSettings: authedProcedure
    .input(ZSaveIncompleteBookingSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await getHandler(
        "saveIncompleteBookingSettings",
        () => import("@calcom/app-store/routing-forms/trpc/saveIncompleteBookingSettings.handler")
      );
      return handler({ ctx, input });
    }),
});

export default appRoutingForms;
