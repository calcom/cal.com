import { z } from "zod";

export const ZAppByIdInputSchema = z.object({
  appId: z.string(),
});

export type TAppByIdInputSchema = z.infer<typeof ZAppByIdInputSchema>;
