import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZConfirmInputSchema } from "./confirm.schema";
import { ZEditLocationInputSchema } from "./editLocation.schema";
import { ZFindInputSchema } from "./find.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetBookingAttendeesInputSchema } from "./getBookingAttendees.schema";
import { ZInstantBookingInputSchema } from "./getInstantBookingLocation.schema";
import { ZRequestRescheduleInputSchema } from "./requestReschedule.schema";
import { bookingsProcedure } from "./util";

type BookingsRouterHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
  requestReschedule?: typeof import("./requestReschedule.handler").requestRescheduleHandler;
  editLocation?: typeof import("./editLocation.handler").editLocationHandler;
  confirm?: typeof import("./confirm.handler").confirmHandler;
  getBookingAttendees?: typeof import("./getBookingAttendees.handler").getBookingAttendeesHandler;
  find?: typeof import("./find.handler").getHandler;
  getInstantBookingLocation?: typeof import("./getInstantBookingLocation.handler").getHandler;
};

const UNSTABLE_HANDLER_CACHE: BookingsRouterHandlerCache = {};

export const bookingsRouter = router({
  get: authedProcedure.input(ZGetInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.get) {
      UNSTABLE_HANDLER_CACHE.get = await import("./get.handler").then((mod) => mod.getHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.get) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.get({
      ctx,
      input,
    });
  }),

  requestReschedule: authedProcedure.input(ZRequestRescheduleInputSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.requestReschedule) {
      UNSTABLE_HANDLER_CACHE.requestReschedule = await import("./requestReschedule.handler").then(
        (mod) => mod.requestRescheduleHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.requestReschedule) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.requestReschedule({
      ctx,
      input,
    });
  }),

  editLocation: bookingsProcedure.input(ZEditLocationInputSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.editLocation) {
      UNSTABLE_HANDLER_CACHE.editLocation = await import("./editLocation.handler").then(
        (mod) => mod.editLocationHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.editLocation) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.editLocation({
      ctx,
      input,
    });
  }),

  confirm: bookingsProcedure.input(ZConfirmInputSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.confirm) {
      UNSTABLE_HANDLER_CACHE.confirm = await import("./confirm.handler").then((mod) => mod.confirmHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.confirm) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.confirm({
      ctx,
      input,
    });
  }),

  getBookingAttendees: authedProcedure
    .input(ZGetBookingAttendeesInputSchema)
    .query(async ({ input, ctx }) => {
      if (!UNSTABLE_HANDLER_CACHE.getBookingAttendees) {
        UNSTABLE_HANDLER_CACHE.getBookingAttendees = await import("./getBookingAttendees.handler").then(
          (mod) => mod.getBookingAttendeesHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getBookingAttendees) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getBookingAttendees({
        ctx,
        input,
      });
    }),

  find: publicProcedure.input(ZFindInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.find) {
      UNSTABLE_HANDLER_CACHE.find = await import("./find.handler").then((mod) => mod.getHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.find) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.find({
      ctx,
      input,
    });
  }),

  getInstantBookingLocation: publicProcedure
    .input(ZInstantBookingInputSchema)
    .query(async ({ input, ctx }) => {
      if (!UNSTABLE_HANDLER_CACHE.getInstantBookingLocation) {
        UNSTABLE_HANDLER_CACHE.getInstantBookingLocation = await import(
          "./getInstantBookingLocation.handler"
        ).then((mod) => mod.getHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getInstantBookingLocation) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getInstantBookingLocation({
        ctx,
        input,
      });
    }),
});
