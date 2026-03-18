import { z } from "zod";

export const ZSearchUsersByEmailSchema = z.object({
  teamId: z.number(),
  query: z.string().min(3),
  cursor: z.number().nullish(),
  limit: z.number().min(1).max(50).default(10),
});

export type TSearchUsersByEmailInput = z.infer<typeof ZSearchUsersByEmailSchema>;
