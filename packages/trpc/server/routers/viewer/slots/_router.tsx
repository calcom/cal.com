import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";

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

    // Extract authenticated user email from session cookie for host reschedule verification.
    // We also validate the booking exists and the user is the organizer to prevent
    // any authenticated user from bypassing Redis cache with arbitrary parameters.
    let authenticatedEmail: string | null = null;
    if (input.rescheduledBy && input.rescheduleUid && ctx.req) {
      const session = await getServerSession({ req: ctx.req });
      const sessionEmail = session?.user?.email ?? null;
      if (sessionEmail && sessionEmail === input.rescheduledBy) {
        const bookingRepository = new BookingRepository(ctx.prisma);
        const organizerEmail = await bookingRepository.findOrganizerEmailByUid({
          uid: input.rescheduleUid,
        });
        if (organizerEmail === sessionEmail) {
          authenticatedEmail = sessionEmail;
        }
      }
    }

    return getScheduleHandler({
      ctx: { ...ctx, authenticatedEmail },
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
