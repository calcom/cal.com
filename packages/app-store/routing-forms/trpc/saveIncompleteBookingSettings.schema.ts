import { IncompleteBookingActionType } from "@calcom/prisma/enums";
import z from "zod";

export const ZSaveIncompleteBookingSettingsInputSchema = z.object({
  formId: z.string(),
  actionType: z.nativeEnum(IncompleteBookingActionType),
  data: z.record(z.any()).optional(),
  enabled: z.boolean(),
  credentialId: z.number().optional(),
});

export type TSaveIncompleteBookingSettingsInputSchema = z.infer<
  typeof ZSaveIncompleteBookingSettingsInputSchema
>;
