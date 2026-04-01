import { z } from "zod";

export const ZReleaseUsernameSchema = z.object({
  username: z.string().min(1),
  organizationId: z.number().int().nullable(),
  mode: z.enum(["preview", "execute"]),
});

export type TReleaseUsernameSchema = z.infer<typeof ZReleaseUsernameSchema>;
