import { z } from "zod";

export type TFormQueryInputSchema = {
  id: string;
};

export const ZFormQueryInputSchema = z.object({
  id: z.string(),
});
