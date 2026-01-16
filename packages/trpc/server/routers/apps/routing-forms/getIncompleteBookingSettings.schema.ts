import z from "zod";

export type TGetIncompleteBookingSettingsInputSchema = {
  formId: string;
};

export const ZGetIncompleteBookingSettingsInputSchema: z.ZodType<TGetIncompleteBookingSettingsInputSchema> =
  z.object({
    formId: z.string(),
  });
