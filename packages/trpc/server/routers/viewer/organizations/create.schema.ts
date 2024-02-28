import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZCreateInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  adminEmail: z.string().email(),
  language: z.string().optional(),
  seats: z.number().optional(),
  pricePerSeat: z.number().optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
