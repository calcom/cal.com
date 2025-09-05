import { AppCategories } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZListLocalInputSchema = z.object({
  category: z.nativeEnum({ ...AppCategories, conferencing: "conferencing" }),
});

export type TListLocalInputSchema = z.infer<typeof ZListLocalInputSchema>;
