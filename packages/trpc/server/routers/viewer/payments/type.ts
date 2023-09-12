import { z } from "zod";

export const ChargerCardSchema = z.object({
  bookingId: z.number(),
});

export type TChargeCardSchema = z.infer<typeof ChargerCardSchema>;
