import { router, publicProcedure } from "../../../trpc";
import { getScheduleSchema } from "./schemas/getScheduleSchema";

/** This should be called getAvailableSlots */
export const slotsRouter = router({
  getSchedule: publicProcedure.input(getScheduleSchema).query(async ({ input, ctx }) => {
    const { getSchedule } = await import("./getSchecule");
    return await getSchedule(input, ctx);
  }),
});
