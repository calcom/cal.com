import { z } from "zod";

export const icsFeedAddBodySchema = z.object({
  urls: z.array(z.string().url()).min(1),
});
