import { z } from "zod";

import { ZActiveFilter, ZColumnSizing, ZColumnVisibility, ZSortingState } from "./types";

// Base schema for common fields that can be updated
const baseUpdateSchema = {
  name: z.string().min(1).optional(),
  activeFilters: ZActiveFilter.optional(),
  sorting: ZSortingState.optional(),
  columnVisibility: ZColumnVisibility.optional(),
  columnSizing: ZColumnSizing.optional(),
  perPage: z.number().int().min(1).optional(),
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
