import { z } from "zod";

// Schema for team scope deletes
const teamDeleteSchema = z.object({
  id: z.number().int().positive(),
  scope: z.literal("TEAM"),
  teamId: z.number().int().positive(),
});

// Schema for user scope deletes
const userDeleteSchema = z.object({
  id: z.number().int().positive(),
  scope: z.literal("USER"),
  teamId: z.undefined(),
});

export const ZDeleteFilterSegmentInputSchema = z.discriminatedUnion("scope", [
  teamDeleteSchema,
  userDeleteSchema,
]);

export type TDeleteFilterSegmentInputSchema = z.infer<typeof ZDeleteFilterSegmentInputSchema>;
