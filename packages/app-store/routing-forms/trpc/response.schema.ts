import { z } from "zod";

export const ZResponseInputSchema = z.object({
  formId: z.string(),
  formFillerId: z.string(),
  response: z.record(
    z.object({
      label: z.string(),
      value: z.union([z.string(), z.array(z.string())]),
    })
  ),
});

export type TResponseInputSchema = z.infer<typeof ZResponseInputSchema>;
