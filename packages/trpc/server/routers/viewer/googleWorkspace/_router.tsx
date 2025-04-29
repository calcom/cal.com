import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

type GoogleWorkspaceCache = {
  checkForGWorkspace?: typeof import("./googleWorkspace.handler").checkForGWorkspace;
  getUsersFromGWorkspace?: typeof import("./googleWorkspace.handler").getUsersFromGWorkspace;
  removeCurrentGoogleWorkspaceConnection?: typeof import("./googleWorkspace.handler").removeCurrentGoogleWorkspaceConnection;
};

export const googleWorkspaceRouter = router({
  checkForGWorkspace: authedProcedure.query(async ({ ctx }) => {
    const { checkForGWorkspace } = await import("./googleWorkspace.handler");

    return checkForGWorkspace({
      ctx,
    });
  }),
  getUsersFromGWorkspace: authedProcedure.mutation(async ({ ctx }) => {
    const { getUsersFromGWorkspace } = await import("./googleWorkspace.handler");

    return getUsersFromGWorkspace({
      ctx,
    });
  }),
  removeCurrentGoogleWorkspaceConnection: authedProcedure.mutation(async ({ ctx }) => {
    const { removeCurrentGoogleWorkspaceConnection } = await import("./googleWorkspace.handler");

    return removeCurrentGoogleWorkspaceConnection({
      ctx,
    });
  }),
});
