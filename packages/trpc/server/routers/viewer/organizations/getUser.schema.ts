import { z } from "zod";

export const ZGetUserInput = z.object({
  userId: z.number().optional(),
});

export type TGetUserInput = z.infer<typeof ZGetUserInput>;
