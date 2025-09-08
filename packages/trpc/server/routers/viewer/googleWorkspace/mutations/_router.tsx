import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const googleWorkspaceRouter = router({
  getUsersFromGWorkspace: authedProcedure.mutation(async ({ ctx }) => {
    const { getUsersFromGWorkspace } = await import("./getUsersFromGWorkspace.handler");

    return getUsersFromGWorkspace({
      ctx,
    });
  }),
  removeCurrentGoogleWorkspaceConnection: authedProcedure.mutation(async ({ ctx }) => {
    const { removeCurrentGoogleWorkspaceConnection } = await import(
      "./removeCurrentGoogleWorkspaceConnection.handler"
    );

    return removeCurrentGoogleWorkspaceConnection({
      ctx,
    });
  }),
});
