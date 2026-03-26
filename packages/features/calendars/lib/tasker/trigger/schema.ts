import { z } from "zod";

export const calendarsTaskSchema = z.object({
  userId: z.number(),
});
