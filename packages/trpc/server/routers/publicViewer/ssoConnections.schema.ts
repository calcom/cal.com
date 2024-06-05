import { z } from "zod";

export const ZssoConnectionsInputSchema = z.object({
  token: z.string(),
});
