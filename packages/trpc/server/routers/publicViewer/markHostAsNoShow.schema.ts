import { z } from "zod";

export type TNoShowInputSchema = {
  bookingUid: string;
  noShowHost: boolean;
};

export const ZMarkHostAsNoShowInputSchema = z.object({
  bookingUid: z.string(),
  noShowHost: z.boolean(),
});
