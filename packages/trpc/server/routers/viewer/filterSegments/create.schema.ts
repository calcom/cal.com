import { z } from "zod";

// Base schema for common fields
const baseFilterSegmentSchema = {
  name: z.string().min(1),
  tableIdentifier: z.string().min(1),
  activeFilters: z.any().optional(),
  sorting: z.any().optional(),
  columns: z.any().optional(),
  page: z.number().int().min(1),
  size: z.number().int().min(1),
};

// Schema for team scope - requires teamId
const teamScopeSchema = z.object({
  scope: z.literal("TEAM"),
  teamId: z.number().int().positive(),
  ...baseFilterSegmentSchema,
});

// Schema for user scope - no teamId allowed
const userScopeSchema = z.object({
  scope: z.literal("USER"),
  teamId: z.undefined(),
  ...baseFilterSegmentSchema,
});

export const ZCreateFilterSegmentInputSchema = z.discriminatedUnion("scope", [
  teamScopeSchema,
  userScopeSchema,
]);

export type TCreateFilterSegmentInputSchema = z.infer<typeof ZCreateFilterSegmentInputSchema>;
