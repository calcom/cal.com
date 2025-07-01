import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";

import { assignUserToAttributeSchema } from "../attributes/assignUserToAttribute.schema";

export const ZUpdateUserInputSchema = z.object({
  userId: z.number(),
  username: z.string().optional(),
  bio: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(["ADMIN", "MEMBER", "OWNER"]),
  timeZone: timeZoneSchema,
  attributeOptions: assignUserToAttributeSchema.optional(),
});

export type TUpdateUserInputSchema = z.infer<typeof ZUpdateUserInputSchema>;
