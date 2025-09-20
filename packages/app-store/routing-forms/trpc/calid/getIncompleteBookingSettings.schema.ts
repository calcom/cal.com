import z from "zod";

export const ZCalIdGetIncompleteBookingSettingsInputSchema = z.object({
  formId: z.string(),
});

export type TCalIdGetIncompleteBookingSettingsInputSchema = z.infer<
  typeof ZCalIdGetIncompleteBookingSettingsInputSchema
>;
