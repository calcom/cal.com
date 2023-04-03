import { getScheduleSchema } from "../../getScheduleSchema";
import { router, publicProcedure } from "../../trpc";

/** This should be called getAvailableSlots */
export const slotsRouter = router({
  getSchedule: publicProcedure.input(getScheduleSchema).query(async ({ input, ctx }) => {
    const { getSchedule } = await import("./slots/getSchecule");
    return await getSchedule(input, ctx);
  }),
});
