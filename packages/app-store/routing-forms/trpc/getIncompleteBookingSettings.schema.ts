import z from "zod";

export const ZGetIncompleteBookingSettingsInputSchema = z.object({
  formId: z.string(),
});

export type TGetIncompleteBookingSettingsInputSchema = z.infer<
  typeof ZGetIncompleteBookingSettingsInputSchema
>;
