import { z } from "zod";

export const ZUpdateUserInputSchema = z.object({
  userId: z.number(),
  bio: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(["ADMIN", "MEMBER", "OWNER"]),
  timeZone: z.string(),
});

export type TUpdateUserInputSchema = z.infer<typeof ZUpdateUserInputSchema>;
