import type { NextApiRequest, NextApiResponse } from "next";

import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZIsAvailableInputSchema, ZIsAvailableOutputSchema } from "./isAvailable.schema";
import { ZRemoveSelectedSlotInputSchema } from "./removeSelectedSlot.schema";
import { ZReserveSlotInputSchema } from "./reserveSlot.schema";
import { ZGetScheduleInputSchema } from "./types";

type SlotsRouterHandlerCache = {
  getSchedule?: typeof import("./getSchedule.handler").getScheduleHandler;
  reserveSlot?: typeof import("./reserveSlot.handler").reserveSlotHandler;
  isAvailable?: typeof import("./isAvailable.handler").isAvailableHandler;
};

/** This should be called getAvailableSlots */
export const slotsRouter = router({
  getSchedule: publicProcedure.input(ZGetScheduleInputSchema).query(async ({ input, ctx }) => {
    const { getScheduleHandler } = await import("./getSchedule.handler");

    return getScheduleHandler({
      ctx,
      input,
    });
  }),
  reserveSlot: publicProcedure.input(ZReserveSlotInputSchema).mutation(async ({ input, ctx }) => {
    const { reserveSlotHandler } = await import("./reserveSlot.handler");

    return reserveSlotHandler({
      ctx: { ...ctx, req: ctx.req as NextApiRequest, res: ctx.res as NextApiResponse },
      input,
    });
  }),
  isAvailable: publicProcedure
    .input(ZIsAvailableInputSchema)
    .output(ZIsAvailableOutputSchema)
    .query(async ({ input, ctx }) => {
      const { isAvailableHandler } = await import("./isAvailable.handler");

      return isAvailableHandler({
        ctx: { ...ctx, req: ctx.req as NextApiRequest },
        input,
      });
    }),
  // This endpoint has no dependencies, it doesn't need its own file
  removeSelectedSlotMark: publicProcedure
    .input(ZRemoveSelectedSlotInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { req, prisma } = ctx;
      const uid = req?.cookies?.uid || input.uid;
      if (uid) {
        await prisma.selectedSlots.deleteMany({ where: { uid: { equals: uid } } });
      }
      return;
    }),
});
