import { ZProjectMutationInputSchema } from "@calcom/app-store/basecamp3/trpc/projectMutation.schema";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UNSTABLE_HANDLER_CACHE: any = {};

const appBasecamp3 = router({
  projects: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.projects) {
      UNSTABLE_HANDLER_CACHE.projects = await import(
        "@calcom/app-store/basecamp3/trpc/projects.handler"
      ).then((mod) => mod.projectHandler);
    }
    return UNSTABLE_HANDLER_CACHE.projects({ ctx });
  }),
  projectMutation: authedProcedure.input(ZProjectMutationInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.projectMutation) {
      UNSTABLE_HANDLER_CACHE.projectMutation = await import(
        "@calcom/app-store/basecamp3/trpc/projectMutation.handler"
      ).then((mod) => mod.projectMutationHandler);
    }
    return UNSTABLE_HANDLER_CACHE.projectMutation({ ctx, input });
  }),
});

export default appBasecamp3;
