import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  phoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  teamId: z.number().optional(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
