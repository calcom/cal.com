import { z } from "zod";

export type TGetAvatarUrlInputSchema = {
  email: string;
};

export const ZGetAvatarUrlInputSchema: z.ZodType<TGetAvatarUrlInputSchema> = z.object({
  email: z.string().email(),
});
