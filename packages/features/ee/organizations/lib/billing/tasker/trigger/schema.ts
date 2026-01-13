import { z } from "zod";

export const platformBillingTaskSchema = z.object({
  userId: z.number(),
});
