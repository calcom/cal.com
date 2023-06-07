import { z } from "zod";

export const ZFormsInputSchema = z.object({
  filters: z.object({
    teamIds: z.number().array().optional(),
    userIds: z.number().array().optional(),
  }),
});

export type TFormSchema = z.infer<typeof ZFormsInputSchema>;
