import { z } from "zod";

export const ZZohoConnectionInputSchema = z
  .object({
    token: z.string().optional(),
  })
  .optional();

export type TZohoConnectionInputSchema = z.infer<typeof ZZohoConnectionInputSchema>;
