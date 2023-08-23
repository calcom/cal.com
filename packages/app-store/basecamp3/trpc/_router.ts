import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZProjectMutationInputSchema } from "./projectMutation.schema";

const UNSTABLE_HANDLER_CACHE: any = {};

const appBasecamp3 = router({
  projects: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.projects) {
      UNSTABLE_HANDLER_CACHE.projects = await import("./projects.handler").then((mod) => mod.projectHandler);
    }
    return UNSTABLE_HANDLER_CACHE.projects({ ctx });
  }),
  projectMutation: authedProcedure.input(ZProjectMutationInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.projectMutation) {
      UNSTABLE_HANDLER_CACHE.projectMutation = await import("./projectMutation.handler").then(
        (mod) => mod.projectMutationHandler
      );
    }
    return UNSTABLE_HANDLER_CACHE.projectMutation({ ctx, input });
  }),
});

export default appBasecamp3;
