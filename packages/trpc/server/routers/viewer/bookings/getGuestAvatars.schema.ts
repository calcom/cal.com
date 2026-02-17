import { z } from "zod";

export type TGetGuestAvatarsInputSchema = {
  emails: string[];
};

export const ZGetGuestAvatarsInputSchema: z.ZodType<TGetGuestAvatarsInputSchema> = z.object({
  emails: z.array(z.string().email()).max(50),
});
