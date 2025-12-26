import { z } from "zod";

export type TDeleteInputSchema = {
  id: string;
  eventTypeId?: number;
};

export const ZDeleteInputSchema = z.object({
  id: z.string(),
  eventTypeId: z.number().optional(),
});
