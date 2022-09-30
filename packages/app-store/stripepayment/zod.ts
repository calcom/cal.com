import { z } from "zod";

export const appDataSchema = z.object({
  price: z.number(),
  currency: z.string(),
});
