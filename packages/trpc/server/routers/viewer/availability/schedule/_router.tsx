import { isAuthed } from "../../../../middlewares/sessionMiddleware";
import validateCSRF from "../../../../middlewares/validateCSRF";
import authedProcedure from "../../../../procedures/authedProcedure";
import publicProcedure from "../../../../procedures/publicProcedure";
import { router } from "../../../../trpc";
import { ZBulkUpdateToDefaultAvailabilityInputSchema } from "./bulkUpdateDefaultAvailability.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZScheduleDuplicateSchema } from "./duplicate.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetAllByUserIdInputSchema } from "./getAllSchedulesByUserId.schema";
import { ZGetByEventSlugInputSchema } from "./getScheduleByEventTypeSlug.schema";
import { ZGetByUserIdInputSchema } from "./getScheduleByUserId.schema";
import { ZUpdateInputSchema } from "./update.schema";

const protectedMutationProcedure = publicProcedure.use(validateCSRF).use(isAuthed);

export const scheduleRouter = router({
  get: authedProcedure.input(ZGetInputSchema).query(async ({ input, ctx }) => {
    const { getHandler } = await import("./get.handler");

    return getHandler({
      ctx,
      input,
    });
  }),

  create: protectedMutationProcedure.input(ZCreateInputSchema).mutation(async ({ input, ctx }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),

  delete: protectedMutationProcedure.input(ZDeleteInputSchema).mutation(async ({ input, ctx }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),

  update: protectedMutationProcedure.input(ZUpdateInputSchema).mutation(async ({ input, ctx }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),

  duplicate: protectedMutationProcedure.input(ZScheduleDuplicateSchema).mutation(async ({ input, ctx }) => {
    const { duplicateHandler } = await import("./duplicate.handler");

    return duplicateHandler({
      ctx,
      input,
    });
  }),

  getScheduleByUserId: authedProcedure.input(ZGetByUserIdInputSchema).query(async ({ input, ctx }) => {
    const { getScheduleByUserIdHandler } = await import("./getScheduleByUserId.handler");

    return getScheduleByUserIdHandler({
      ctx,
      input,
    });
  }),

  getAllSchedulesByUserId: authedProcedure.input(ZGetAllByUserIdInputSchema).query(async ({ input, ctx }) => {
    const { getAllSchedulesByUserIdHandler } = await import("./getAllSchedulesByUserId.handler");

    return getAllSchedulesByUserIdHandler({
      ctx,
      input,
    });
  }),

  getScheduleByEventSlug: authedProcedure.input(ZGetByEventSlugInputSchema).query(async ({ input, ctx }) => {
    const { getScheduleByEventSlugHandler } = await import("./getScheduleByEventTypeSlug.handler");

    return getScheduleByEventSlugHandler({
      ctx,
      input,
    });
  }),
  bulkUpdateToDefaultAvailability: protectedMutationProcedure
    .input(ZBulkUpdateToDefaultAvailabilityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { bulkUpdateToDefaultAvailabilityHandler } = await import(
        "./bulkUpdateDefaultAvailability.handler"
      );

      return bulkUpdateToDefaultAvailabilityHandler({
        ctx,
        input,
      });
    }),
});
