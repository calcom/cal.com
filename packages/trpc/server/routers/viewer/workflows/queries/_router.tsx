import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZFilteredListInputSchema } from "../filteredList.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
import { ZGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";
import { ZGetVerifiedNumbersInputSchema } from "./getVerifiedNumbers.schema";
import { ZListInputSchema } from "./list.schema";

export const workflowsQueriesRouter = router({
  list: authedProcedure.input(ZListInputSchema).query(async ({ ctx, input }) => {
    const { listHandler } = await import("./list.handler");
    return listHandler({
      ctx,
      input,
    });
  }),

  get: authedProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./get.handler");
    return getHandler({
      ctx,
      input,
    });
  }),

  getVerifiedNumbers: authedProcedure.input(ZGetVerifiedNumbersInputSchema).query(async ({ ctx, input }) => {
    const { getVerifiedNumbersHandler } = await import("./getVerifiedNumbers.handler");
    return getVerifiedNumbersHandler({
      ctx,
      input,
    });
  }),

  getVerifiedEmails: authedProcedure.input(ZGetVerifiedEmailsInputSchema).query(async ({ ctx, input }) => {
    const { getVerifiedEmailsHandler } = await import("./getVerifiedEmails.handler");
    return getVerifiedEmailsHandler({
      ctx,
      input,
    });
  }),

  getWorkflowActionOptions: authedProcedure.query(async ({ ctx }) => {
    const { getWorkflowActionOptionsHandler } = await import("./getWorkflowActionOptions.handler");
    return getWorkflowActionOptionsHandler({
      ctx,
    });
  }),

  filteredList: authedProcedure.input(ZFilteredListInputSchema).query(async ({ ctx, input }) => {
    const { filteredListHandler } = await import("../filteredList.handler");
    return filteredListHandler({
      ctx,
      input,
    });
  }),

  getAllActiveWorkflows: authedProcedure
    .input(ZGetAllActiveWorkflowsInputSchema)
    .query(async ({ ctx, input }) => {
      const { getAllActiveWorkflowsHandler } = await import("./getAllActiveWorkflows.handler");
      return getAllActiveWorkflowsHandler({
        ctx,
        input,
      });
    }),
});
