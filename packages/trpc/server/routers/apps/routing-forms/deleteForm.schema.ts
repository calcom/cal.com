import z from "zod";

export type TDeleteFormInputSchema = {
  id: string;
};

export const ZDeleteFormInputSchema: z.ZodType<TDeleteFormInputSchema> = z.object({
  id: z.string(),
});
