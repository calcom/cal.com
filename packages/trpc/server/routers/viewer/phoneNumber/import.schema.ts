import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";

export const ZImportInputSchema = z.object({
  phoneNumber: z.string().refine((val) => isValidPhoneNumber(val), {
    message: "Invalid phone number",
  }),
  terminationUri: z.string(),
  sipTrunkAuthUsername: z.string().optional(),
  sipTrunkAuthPassword: z.string().optional(),
  nickname: z.string().optional(),
  teamId: z.number().optional(),
  agentId: z.string({ required_error: "agentId is required" }).min(1, "agentId is required"),
});

export type TImportInputSchema = z.infer<typeof ZImportInputSchema>;
