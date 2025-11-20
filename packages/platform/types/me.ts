import { z } from "zod";

export const userSchemaResponse = z.object({
  id: z.number().int(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  timeFormat: z.number().int().default(12),
  defaultScheduleId: z.number().int().nullable(),
  weekStart: z.string(),
  timeZone: z.string().default("Europe/London"),
  username: z.string(),
  organizationId: z.number().nullable(),
  organization: z.object({ isPlatform: z.boolean(), id: z.number() }).optional(),
});

export type UserResponse = z.infer<typeof userSchemaResponse>;
