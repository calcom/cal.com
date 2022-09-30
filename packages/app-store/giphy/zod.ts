import { z } from "zod";

export const appDataSchema = z.object({
  thankYouPage: z.string().optional(),
});
