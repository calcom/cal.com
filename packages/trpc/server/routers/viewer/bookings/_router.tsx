import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";

import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZAddGuestsInputSchema } from "./addGuests.schema";
import { ZConfirmInputSchema } from "./confirm.schema";
import { ZEditLocationInputSchema } from "./editLocation.schema";
import { ZFindInputSchema } from "./find.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetBookingAttendeesInputSchema } from "./getBookingAttendees.schema";
import { ZGetBookingDetailsInputSchema } from "./getBookingDetails.schema";
import { ZGetBookingHistoryInputSchema } from "./getBookingHistory.schema";
import { ZInstantBookingInputSchema } from "./getInstantBookingLocation.schema";
import { ZGetRoutingTraceInputSchema } from "./getRoutingTrace.schema";
import { ZReportBookingInputSchema } from "./reportBooking.schema";
import { ZReportWrongAssignmentInputSchema } from "./reportWrongAssignment.schema";
import { ZRequestRescheduleInputSchema } from "./requestReschedule.schema";
import { bookingsProcedure } from "./util";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
export const bookingsRouter = router({
  get: authedProcedure.input(ZGetInputSchema).query(async ({ input, ctx }) => {
    const { getHandler } = await import("./get.handler");

    return getHandler({
      ctx,
      input,
    });
  }),

  requestReschedule: authedProcedure.input(ZRequestRescheduleInputSchema).mutation(async ({ input, ctx }) => {
    const { requestRescheduleHandler } = await import("./requestReschedule.handler");

    return requestRescheduleHandler({
      ctx,
      input,
      source: "WEBAPP",
      impersonatedByUserUuid: ctx.session?.user?.impersonatedBy?.uuid,
    });
  }),

  editLocation: bookingsProcedure.input(ZEditLocationInputSchema).mutation(async ({ input, ctx }) => {
    const { editLocationHandler } = await import("./editLocation.handler");

    return editLocationHandler({
      ctx,
      input,
      actionSource: "WEBAPP",
      impersonatedByUserUuid: ctx.session?.user?.impersonatedBy?.uuid,
    });
  }),

  addGuests: authedProcedure.input(ZAddGuestsInputSchema).mutation(async ({ input, ctx }) => {
    const { addGuestsHandler } = await import("./addGuests.handler");

    return addGuestsHandler({
      ctx,
      input,
      actionSource: "WEBAPP",
      impersonatedByUserUuid: ctx.session?.user?.impersonatedBy?.uuid,
    });
  }),

  confirm: authedProcedure.input(ZConfirmInputSchema).mutation(async ({ input, ctx }) => {
    const { confirmHandler } = await import("./confirm.handler");

    return confirmHandler({
      ctx,
      input: {
        ...input,
        actor: makeUserActor(ctx.user.uuid),
        actionSource: "WEBAPP",
        impersonatedByUserUuid: ctx.session?.user?.impersonatedBy?.uuid,
      }
    });
  }),

  getBookingAttendees: authedProcedure
    .input(ZGetBookingAttendeesInputSchema)
    .query(async ({ input, ctx }) => {
      const { getBookingAttendeesHandler } = await import("./getBookingAttendees.handler");

      return getBookingAttendeesHandler({
        ctx,
        input,
      });
    }),

  getBookingDetails: authedProcedure.input(ZGetBookingDetailsInputSchema).query(async ({ input, ctx }) => {
    const { getBookingDetailsHandler } = await import("./getBookingDetails.handler");

    return getBookingDetailsHandler({
      ctx,
      input,
    });
  }),

  find: publicProcedure.input(ZFindInputSchema).query(async ({ input, ctx }) => {
    const { getHandler } = await import("./find.handler");

    return getHandler({
      ctx,
      input,
    });
  }),

  getInstantBookingLocation: publicProcedure
    .input(ZInstantBookingInputSchema)
    .query(async ({ input, ctx }) => {
      const { getHandler } = await import("./getInstantBookingLocation.handler");

      return getHandler({
        ctx,
        input,
      });
    }),

  reportBooking: authedProcedure.input(ZReportBookingInputSchema).mutation(async ({ input, ctx }) => {
    const { reportBookingHandler } = await import("./reportBooking.handler");

    return reportBookingHandler({
      ctx,
      input,
    });
  }),
  reportWrongAssignment: authedProcedure
    .input(ZReportWrongAssignmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { reportWrongAssignmentHandler } = await import("./reportWrongAssignment.handler");

      return reportWrongAssignmentHandler({
        ctx,
        input,
      });
    }),
  getBookingHistory: authedProcedure.input(ZGetBookingHistoryInputSchema).query(async ({ input, ctx }) => {
    const { getBookingHistoryHandler } = await import("./getBookingHistory.handler");

    return getBookingHistoryHandler({
      ctx,
      input,
    });
  }),
  getRoutingTrace: authedProcedure.input(ZGetRoutingTraceInputSchema).query(async ({ input, ctx }) => {
    const { getRoutingTraceHandler } = await import("./getRoutingTrace.handler");

    return getRoutingTraceHandler({
      ctx,
      input,
    });
  }),
});
