import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZSyncTemplatesInputSchema } from "./syncTemplates.schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UNSTABLE_HANDLER_CACHE: any = {};

const appWhatsappBusiness = router({
  syncTemplates: authedProcedure
    .input(ZSyncTemplatesInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.syncTemplatesHandler) {
        UNSTABLE_HANDLER_CACHE.syncTemplatesHandler = await import("./syncTemplates.handler").then(
          (mod) => mod.syncTemplatesHandler
        );
      }
      return UNSTABLE_HANDLER_CACHE.syncTemplatesHandler({ ctx, input });
    }),
});

export default appWhatsappBusiness;
