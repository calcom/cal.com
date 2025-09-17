import { MembershipRole } from "@calcom/prisma/enums";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { createEventPbacProcedure } from "../util";
import { ZCreateInputSchema } from "./create.schema";
import { ZDuplicateInputSchema } from "./duplicate.schema";
import { ZUpdateInputSchema } from "./update.schema";

export const eventTypesRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),
  duplicate: createEventPbacProcedure("eventType.create", [MembershipRole.ADMIN, MembershipRole.OWNER])
    .input(ZDuplicateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { duplicateHandler } = await import("./duplicate.handler");

      return duplicateHandler({
        ctx,
        input,
      });
    }),
  update: createEventPbacProcedure("eventType.update", [MembershipRole.ADMIN, MembershipRole.OWNER])
    .input(ZUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateHandler } = await import("./update.handler");

      return updateHandler({
        ctx,
        input,
      });
    }),
});
