import z from "zod";

export const ZDeleteFormInputSchema = z.object({
  id: z.string(),
});

export type TDeleteFormInputSchema = z.infer<typeof ZDeleteFormInputSchema>;
