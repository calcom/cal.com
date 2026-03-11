import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import {
  ZUnifiedCalendarCancelBookingInputSchema,
  ZUnifiedCalendarCancelBookingOutputSchema,
} from "./cancelBooking.schema";
import {
  ZUnifiedCalendarCreateBookingInputSchema,
  ZUnifiedCalendarCreateBookingOutputSchema,
} from "./createBooking.schema";
import { ZUnifiedCalendarListInputSchema, ZUnifiedCalendarListOutputSchema } from "./list.schema";
import {
  ZUnifiedCalendarRescheduleBookingInputSchema,
  ZUnifiedCalendarRescheduleBookingOutputSchema,
} from "./rescheduleBooking.schema";
import { ZToggleCalendarSyncInputSchema, ZToggleCalendarSyncOutputSchema } from "./toggleCalendarSync.schema";

type UnifiedCalendarRouterHandlerCache = {
  list?: typeof import("./list.handler").listUnifiedCalendarHandler;
  toggleCalendarSync?: typeof import("./toggleCalendarSync.handler").toggleCalendarSyncHandler;
  createBooking?: typeof import("./createBooking.handler").createUnifiedCalendarBookingHandler;
  rescheduleBooking?: typeof import("./rescheduleBooking.handler").rescheduleUnifiedCalendarBookingHandler;
  cancelBooking?: typeof import("./cancelBooking.handler").cancelUnifiedCalendarBookingHandler;
};

const UNSTABLE_HANDLER_CACHE: UnifiedCalendarRouterHandlerCache = {};

export const unifiedCalendarRouter = router({
  list: authedProcedure
    .input(ZUnifiedCalendarListInputSchema)
    .output(ZUnifiedCalendarListOutputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.list) {
        UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then(
          (mod) => mod.listUnifiedCalendarHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.list) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.list({ ctx, input });
    }),

  toggleCalendarSync: authedProcedure
    .input(ZToggleCalendarSyncInputSchema)
    .output(ZToggleCalendarSyncOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.toggleCalendarSync) {
        UNSTABLE_HANDLER_CACHE.toggleCalendarSync = await import("./toggleCalendarSync.handler").then(
          (mod) => mod.toggleCalendarSyncHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.toggleCalendarSync) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.toggleCalendarSync({ ctx, input });
    }),

  createBooking: authedProcedure
    .input(ZUnifiedCalendarCreateBookingInputSchema)
    .output(ZUnifiedCalendarCreateBookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.createBooking) {
        UNSTABLE_HANDLER_CACHE.createBooking = await import("./createBooking.handler").then(
          (mod) => mod.createUnifiedCalendarBookingHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.createBooking) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.createBooking({ ctx, input });
    }),

  rescheduleBooking: authedProcedure
    .input(ZUnifiedCalendarRescheduleBookingInputSchema)
    .output(ZUnifiedCalendarRescheduleBookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.rescheduleBooking) {
        UNSTABLE_HANDLER_CACHE.rescheduleBooking = await import("./rescheduleBooking.handler").then(
          (mod) => mod.rescheduleUnifiedCalendarBookingHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.rescheduleBooking) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.rescheduleBooking({ ctx, input });
    }),

  cancelBooking: authedProcedure
    .input(ZUnifiedCalendarCancelBookingInputSchema)
    .output(ZUnifiedCalendarCancelBookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.cancelBooking) {
        UNSTABLE_HANDLER_CACHE.cancelBooking = await import("./cancelBooking.handler").then(
          (mod) => mod.cancelUnifiedCalendarBookingHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.cancelBooking) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.cancelBooking({ ctx, input });
    }),
});
