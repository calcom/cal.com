import { z } from "zod";

export const ZGetBrandSchema = z.object({
  orgId: z.number().optional().nullable(),
});

export type TGetBrandSchema = z.infer<typeof ZGetBrandSchema>;
