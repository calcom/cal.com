import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { bookingsProcedure } from "../../util";
import { ZAddGuestsInputSchema } from "./addGuests.schema";
import { ZConfirmInputSchema } from "./confirm.schema";
import { ZEditLocationInputSchema } from "./editLocation.schema";
import { ZRequestRescheduleInputSchema } from "./requestReschedule.schema";

export const bookingsMutationsRouter = router({
  requestReschedule: authedProcedure.input(ZRequestRescheduleInputSchema).mutation(async ({ input, ctx }) => {
    const { requestRescheduleHandler } = await import("./requestReschedule.handler");

    return requestRescheduleHandler({
      ctx,
      input,
    });
  }),

  editLocation: bookingsProcedure.input(ZEditLocationInputSchema).mutation(async ({ input, ctx }) => {
    const { editLocationHandler } = await import("./editLocation.handler");

    return editLocationHandler({
      ctx,
      input,
    });
  }),

  addGuests: authedProcedure.input(ZAddGuestsInputSchema).mutation(async ({ input, ctx }) => {
    const { addGuestsHandler } = await import("./addGuests.handler");

    return addGuestsHandler({
      ctx,
      input,
    });
  }),

  confirm: authedProcedure.input(ZConfirmInputSchema).mutation(async ({ input, ctx }) => {
    const { confirmHandler } = await import("./confirm.handler");

    return confirmHandler({
      ctx,
      input,
    });
  }),
});
