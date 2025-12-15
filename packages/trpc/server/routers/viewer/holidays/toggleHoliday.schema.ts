import { z } from "zod";

export const ZToggleHolidaySchema = z.object({
  holidayId: z.string(),
  enabled: z.boolean(),
});

export type TToggleHolidaySchema = z.infer<typeof ZToggleHolidaySchema>;

