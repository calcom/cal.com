import { z } from "zod";

// Base schema for common fields that can be updated
const baseUpdateSchema = {
  name: z.string().min(1).optional(),
  activeFilters: z.any().optional(),
  sorting: z.any().optional(),
  columns: z.any().optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).optional(),
};

// Schema for team scope updates
const teamUpdateSchema = z.object({
  id: z.number().int().positive(),
  scope: z.literal("TEAM"),
  teamId: z.number().int().positive(),
  ...baseUpdateSchema,
});

// Schema for user scope updates
const userUpdateSchema = z.object({
  id: z.number().int().positive(),
  scope: z.literal("USER"),
  teamId: z.undefined(),
  ...baseUpdateSchema,
});

export const ZUpdateFilterSegmentInputSchema = z.discriminatedUnion("scope", [
  teamUpdateSchema,
  userUpdateSchema,
]);

export type TUpdateFilterSegmentInputSchema = z.infer<typeof ZUpdateFilterSegmentInputSchema>;
