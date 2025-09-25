import z from "zod";

export const ZCalIdDeleteFormInputSchema = z.object({
  id: z.string(),
});

export type TCalIdDeleteFormInputSchema = z.infer<typeof ZCalIdDeleteFormInputSchema>;
