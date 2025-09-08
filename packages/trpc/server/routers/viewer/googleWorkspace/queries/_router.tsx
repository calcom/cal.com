import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const googleWorkspaceRouter = router({
  checkForGWorkspace: authedProcedure.query(async ({ ctx }) => {
    const { checkForGWorkspace } = await import("./checkForGWorkspace.handler");

    return checkForGWorkspace({
      ctx,
    });
  }),
});
