import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  phoneNumber: z.string().refine((val) => isValidPhoneNumber(val), {
    message: "Invalid phone number. Use E.164 format like +12025550123.",
  }),
  inboundAgentId: z.union([z.string().trim().min(1), z.literal(null)]).optional(),
  outboundAgentId: z.union([z.string().trim().min(1), z.literal(null)]).optional(),
  teamId: z.number().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
