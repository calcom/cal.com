import { z } from "zod";

export const ZcountryCodeSchema = z.object({
  token: z.string(),
});
