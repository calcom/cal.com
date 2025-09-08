import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZDownloadExpenseLogSchema } from "./downloadExpenseLog.schema";
import { ZGetAllCreditsSchema } from "./getAllCredits.schema";

export const creditsQueriesRouter = router({
  getAllCredits: authedProcedure.input(ZGetAllCreditsSchema).query(async ({ input, ctx }) => {
    const { getAllCreditsHandler } = await import("./getAllCredits.handler");

    return getAllCreditsHandler({
      ctx,
      input,
    });
  }),

  downloadExpenseLog: authedProcedure.input(ZDownloadExpenseLogSchema).query(async ({ input, ctx }) => {
    const { downloadExpenseLogHandler } = await import("./downloadExpenseLog.handler");

    return downloadExpenseLogHandler({
      ctx,
      input,
    });
  }),
});
