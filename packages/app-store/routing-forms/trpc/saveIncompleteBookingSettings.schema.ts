import z from "zod";

import { IncompleteBookingActionType } from "@calcom/prisma/enums";

export const ZSaveIncompleteBookingSettingsInputSchema = z.object({
  formId: z.string(),
  actionType: z.nativeEnum(IncompleteBookingActionType),
  data: z.record(z.any()).optional(),
  enabled: z.boolean(),
});

export type TSaveIncompleteBookingSettingsInputSchema = z.infer<
  typeof ZSaveIncompleteBookingSettingsInputSchema
>;
