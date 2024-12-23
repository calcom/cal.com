import z from "zod";

export const createCRMEventSchema = z.object({
  credentialId: z.number(),
  bookingUid: z.string(),
});
