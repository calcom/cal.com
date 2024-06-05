import { z } from "zod";

export const ZsessionInputSchema = z.object({
  token: z.string(),
});
