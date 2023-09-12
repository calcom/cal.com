import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

type GoogleWorkspaceCache = {
  checkForGWorkspace?: typeof import("./googleWorkspace.handler").checkForGWorkspace;
  getUsersFromGWorkspace?: typeof import("./googleWorkspace.handler").getUsersFromGWorkspace;
  removeCurrentGoogleWorkspaceConnection?: typeof import("./googleWorkspace.handler").removeCurrentGoogleWorkspaceConnection;
};

const UNSTABLE_HANDLER_CACHE: GoogleWorkspaceCache = {};

export const googleWorkspaceRouter = router({
  checkForGWorkspace: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.checkForGWorkspace) {
      UNSTABLE_HANDLER_CACHE.checkForGWorkspace = await import("./googleWorkspace.handler").then(
        (mod) => mod.checkForGWorkspace
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.checkForGWorkspace) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.checkForGWorkspace({
      ctx,
    });
  }),
  getUsersFromGWorkspace: authedProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getUsersFromGWorkspace) {
      UNSTABLE_HANDLER_CACHE.getUsersFromGWorkspace = await import("./googleWorkspace.handler").then(
        (mod) => mod.getUsersFromGWorkspace
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getUsersFromGWorkspace) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getUsersFromGWorkspace({
      ctx,
    });
  }),
  removeCurrentGoogleWorkspaceConnection: authedProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.removeCurrentGoogleWorkspaceConnection) {
      UNSTABLE_HANDLER_CACHE.removeCurrentGoogleWorkspaceConnection = await import(
        "./googleWorkspace.handler"
      ).then((mod) => mod.removeCurrentGoogleWorkspaceConnection);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.removeCurrentGoogleWorkspaceConnection) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.removeCurrentGoogleWorkspaceConnection({
      ctx,
    });
  }),
});
