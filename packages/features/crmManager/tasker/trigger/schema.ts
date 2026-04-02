import { z } from "zod";

export const createCRMEventTaskSchema = z.object({
  bookingUid: z.string(),
});
