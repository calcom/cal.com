import z from "zod";

export const createCRMEventSchema = z.object({
  bookingUid: z.string(),
});
