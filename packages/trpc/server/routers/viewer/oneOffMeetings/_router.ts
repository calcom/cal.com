import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZCreateOneOffMeetingInputSchema } from "./create.schema";
import { ZDeleteOneOffMeetingInputSchema } from "./delete.schema";
import { ZGetOneOffMeetingInputSchema } from "./get.schema";
import { ZGetPublicOneOffMeetingInputSchema } from "./getPublic.schema";
import { ZListOneOffMeetingsInputSchema } from "./list.schema";

export const oneOffMeetingsRouter = router({
  // List all one-off meetings for the current user
  list: authedProcedure.input(ZListOneOffMeetingsInputSchema).query(async ({ ctx, input }) => {
    const { listHandler } = await import("./list.handler");
    return listHandler({ ctx, input });
  }),

  // Get a specific one-off meeting by id or linkHash (authenticated)
  get: authedProcedure.input(ZGetOneOffMeetingInputSchema).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./get.handler");
    return getHandler({ ctx, input });
  }),

  // Get a one-off meeting by linkHash (public - for booking page)
  getPublic: publicProcedure.input(ZGetPublicOneOffMeetingInputSchema).query(async ({ input }) => {
    const { getPublicHandler } = await import("./getPublic.handler");
    return getPublicHandler({ input });
  }),

  // Create a new one-off meeting
  create: authedProcedure.input(ZCreateOneOffMeetingInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");
    return createHandler({ ctx, input });
  }),

  // Delete a one-off meeting
  delete: authedProcedure.input(ZDeleteOneOffMeetingInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");
    return deleteHandler({ ctx, input });
  }),
});

