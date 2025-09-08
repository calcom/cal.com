import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZConnectedCalendarsInputSchema } from "./connectedCalendars.schema";

export const calendarsRouter = router({
  connectedCalendars: authedProcedure.input(ZConnectedCalendarsInputSchema).query(async ({ ctx, input }) => {
    const { connectedCalendarsHandler } = await import("./connectedCalendars.handler");

    return connectedCalendarsHandler({ ctx, input });
  }),
});
