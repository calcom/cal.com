import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router, importHandler } from "../../../trpc";
import { ZDeleteFormInputSchema } from "./deleteForm.schema";
import { ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema } from "./findTeamMembersMatchingAttributeLogicOfRoute.schema";
import { ZFormMutationInputSchema } from "./formMutation.schema";
import { ZFormQueryInputSchema } from "./formQuery.schema";
import { ZGetAttributesForTeamInputSchema } from "./getAttributesForTeam.schema";
import { ZGetIncompleteBookingSettingsInputSchema } from "./getIncompleteBookingSettings.schema";
import { forms } from "./procedures/forms";
import { ZReportInputSchema } from "./report.schema";
import { ZResponseInputSchema } from "./response.schema";
import { ZSaveIncompleteBookingSettingsInputSchema } from "./saveIncompleteBookingSettings.schema";

const NAMESPACE = "routingForms";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const ZFormByResponseIdInputSchema = z.object({
  formResponseId: z.number(),
});

export type TFormQueryInputSchema = z.infer<typeof ZFormQueryInputSchema>;

export const routingFormsRouter = router({
  forms,
  formQuery: authedProcedure.input(ZFormQueryInputSchema).query(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("formQuery"), () => import("./formQuery.handler"));
    return handler({ ctx, input });
  }),
  getResponseWithFormFields: authedProcedure
    .input(ZFormByResponseIdInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("getResponseWithFormFields"),
        () => import("./getResponseWithFormFields.handler")
      );
      return handler({ ctx, input });
    }),
  formMutation: authedProcedure.input(ZFormMutationInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("formMutation"), () => import("./formMutation.handler"));
    return handler({ ctx, input });
  }),
  deleteForm: authedProcedure.input(ZDeleteFormInputSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("deleteForm"), () => import("./deleteForm.handler"));
    return handler({ ctx, input });
  }),

  report: authedProcedure.input(ZReportInputSchema).query(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("report"), () => import("./report.handler"));
    return handler({ ctx, input });
  }),

  getAttributesForTeam: authedProcedure
    .input(ZGetAttributesForTeamInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("getAttributesForTeam"),
        () => import("./getAttributesForTeam.handler")
      );
      return handler({ ctx, input });
    }),

  getIncompleteBookingSettings: authedProcedure
    .input(ZGetIncompleteBookingSettingsInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("getIncompleteBookingSettings"),
        () => import("./getIncompleteBookingSettings.handler")
      );
      return handler({ ctx, input });
    }),

  saveIncompleteBookingSettings: authedProcedure
    .input(ZSaveIncompleteBookingSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("saveIncompleteBookingSettings"),
        () => import("./saveIncompleteBookingSettings.handler")
      );
      return handler({ ctx, input });
    }),

  findTeamMembersMatchingAttributeLogicOfRoute: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("findTeamMembersMatchingAttributeLogicOfRoute"),
        () => import("./findTeamMembersMatchingAttributeLogicOfRoute.handler")
      );
      return handler({ ctx, input });
    }),

  public: router({
    response: publicProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
      const handler = await importHandler(namespaced("response"), () => import("./response.handler"));
      return handler({ ctx, input });
    }),
  }),
});

export default routingFormsRouter;
