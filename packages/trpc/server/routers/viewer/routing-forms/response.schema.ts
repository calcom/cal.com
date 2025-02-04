import { z } from "zod";

export const ZResponseInputSchema = z.object({
  formId: z.string(),
  formFillerId: z.string(),
  response: z.record(
    z.object({
      label: z.string(),
      identifier: z.string().optional(),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
    })
  ),
  // TODO: There could be existing forms loaded that will not send chosenRouteId. Make it required later.
  chosenRouteId: z.string().optional(),
  isPreview: z.boolean().optional(),
});

export type TResponseInputSchema = z.infer<typeof ZResponseInputSchema>;
