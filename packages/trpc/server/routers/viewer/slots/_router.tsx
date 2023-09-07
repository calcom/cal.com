import type { NextApiRequest, NextApiResponse } from "next";

import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZGetScheduleInputSchema } from "./getSchedule.schema";
import { ZRemoveSelectedSlotInputSchema } from "./removeSelectedSlot.schema";
import { ZReserveSlotInputSchema } from "./reserveSlot.schema";

type SlotsRouterHandlerCache = {
  getSchedule?: typeof import("./getSchedule.handler").getScheduleHandler;
  reserveSlot?: typeof import("./reserveSlot.handler").reserveSlotHandler;
};

const UNSTABLE_HANDLER_CACHE: SlotsRouterHandlerCache = {};

/** This should be called getAvailableSlots */
export const slotsRouter = router({
  getSchedule: publicProcedure.input(ZGetScheduleInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getSchedule) {
      UNSTABLE_HANDLER_CACHE.getSchedule = await import("./getSchedule.handler").then(
        (mod) => mod.getScheduleHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getSchedule) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getSchedule({
      ctx,
      input,
    });
  }),
  reserveSlot: publicProcedure.input(ZReserveSlotInputSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.reserveSlot) {
      UNSTABLE_HANDLER_CACHE.reserveSlot = await import("./reserveSlot.handler").then(
        (mod) => mod.reserveSlotHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.reserveSlot) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.reserveSlot({
      ctx: { ...ctx, req: ctx.req as NextApiRequest, res: ctx.res as NextApiResponse },
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
