import authedProcedure from "../../../../procedures/authedProcedure";
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

type ScheduleRouterHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
  create?: typeof import("./create.handler").createHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  update?: typeof import("./update.handler").updateHandler;
  duplicate?: typeof import("./duplicate.handler").duplicateHandler;
  getScheduleByUserId?: typeof import("./getScheduleByUserId.handler").getScheduleByUserIdHandler;
  getAllSchedulesByUserId?: typeof import("./getAllSchedulesByUserId.handler").getAllSchedulesByUserIdHandler;
  getScheduleByEventSlug?: typeof import("./getScheduleByEventTypeSlug.handler").getScheduleByEventSlugHandler;
  bulkUpdateToDefaultAvailability?: typeof import("./bulkUpdateDefaultAvailability.handler").bulkUpdateToDefaultAvailabilityHandler;
};

export const scheduleRouter = router({
  get: authedProcedure.input(ZGetInputSchema).query(async ({ input, ctx }) => {
    const { getHandler } = await import("./get.handler");

    return getHandler({
      ctx,
      input,
    });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ input, ctx }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ input, ctx }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ input, ctx }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),

  duplicate: authedProcedure.input(ZScheduleDuplicateSchema).mutation(async ({ input, ctx }) => {
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
  bulkUpdateToDefaultAvailability: authedProcedure
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
