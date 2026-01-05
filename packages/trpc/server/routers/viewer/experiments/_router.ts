import { ExperimentsRepository } from "@calcom/features/experiments";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";
import { z } from "zod";

export const experimentsRouter = router({
  getVariant: authedProcedure
    .input(
      z.object({
        experimentSlug: z.string(),
        userId: z.number().optional(),
        teamId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const repository = new ExperimentsRepository(ctx.prisma);
      return repository.getVariantForUser(input.experimentSlug, {
        userId: input.userId,
        teamId: input.teamId,
      });
    }),
});
