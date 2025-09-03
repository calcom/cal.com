import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const googleWorkspaceRouter = router({
  checkForGWorkspace: authedProcedure.query(async ({ ctx }) => {
    const { checkForGWorkspace } = await import("../quarantine/misc/googleWorkspace.handler");

    return checkForGWorkspace({
      ctx,
    });
  }),
  getUsersFromGWorkspace: authedProcedure.mutation(async ({ ctx }) => {
    const { getUsersFromGWorkspace } = await import("../quarantine/misc/googleWorkspace.handler");

    return getUsersFromGWorkspace({
      ctx,
    });
  }),
  removeCurrentGoogleWorkspaceConnection: authedProcedure.mutation(async ({ ctx }) => {
    const { removeCurrentGoogleWorkspaceConnection } = await import(
      "../quarantine/misc/googleWorkspace.handler"
    );

    return removeCurrentGoogleWorkspaceConnection({
      ctx,
    });
  }),
});
