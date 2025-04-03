import { z } from "zod";

import { ZActiveFilters, ZColumnSizing, ZColumnVisibility, ZSortingState } from "./types";

// Base schema for common fields
const baseCreateSchema = {
  name: z.string().min(1),
  tableIdentifier: z.string().min(1),
  activeFilters: ZActiveFilters.optional(),
  sorting: ZSortingState.optional(),
  columnVisibility: ZColumnVisibility.optional(),
  columnSizing: ZColumnSizing.optional(),
  searchTerm: z.string().nullable().optional(),
  perPage: z.number().int().min(1),
};

// Schema for team scope - requires teamId
const teamCreateSchema = z.object({
  scope: z.literal("TEAM"),
  teamId: z.number().int().positive(),
  ...baseCreateSchema,
});

// Schema for user scope - no teamId allowed
const userCreateSchema = z.object({
  scope: z.literal("USER"),
  teamId: z.undefined(),
  ...baseCreateSchema,
});

export const ZCreateFilterSegmentInputSchema = z.discriminatedUnion("scope", [
  teamCreateSchema,
  userCreateSchema,
]);

export type TCreateFilterSegmentInputSchema = z.infer<typeof ZCreateFilterSegmentInputSchema>;
