import {
  ZActiveFilters,
  ZColumnSizing,
  ZColumnVisibility,
  ZSortingState,
} from "@calcom/features/data-table/lib/types";
import { z } from "zod";

export const ZListFilterSegmentsInputSchema = z.object({
  tableIdentifier: z.string(),
});

export type TListFilterSegmentsInputSchema = z.infer<typeof ZListFilterSegmentsInputSchema>;

export const ZDeleteFilterSegmentInputSchema = z.object({
  id: z.number().int().positive(),
});

export type TDeleteFilterSegmentInputSchema = z.infer<typeof ZDeleteFilterSegmentInputSchema>;

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
  teamId: z.undefined().optional(),
  ...baseCreateSchema,
});

export const ZCreateFilterSegmentInputSchema = z.discriminatedUnion("scope", [
  teamCreateSchema,
  userCreateSchema,
]);

export type TCreateFilterSegmentInputSchema = z.infer<typeof ZCreateFilterSegmentInputSchema>;

const ZSegmentIdentifier = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("system") }),
  z.object({ id: z.number(), type: z.literal("user") }),
]);

export const ZSetFilterSegmentPreferenceInputSchema = z.object({
  tableIdentifier: z.string(),
  segmentId: ZSegmentIdentifier.nullable(),
});

export type TSetFilterSegmentPreferenceInputSchema = z.infer<typeof ZSetFilterSegmentPreferenceInputSchema>;

// Base schema for common fields that can be updated
const baseUpdateSchema = {
  name: z.string().min(1).optional(),
  tableIdentifier: z.string().min(1).optional(),
  activeFilters: ZActiveFilters.optional(),
  sorting: ZSortingState.optional(),
  columnVisibility: ZColumnVisibility.optional(),
  columnSizing: ZColumnSizing.optional(),
  searchTerm: z.string().nullable().optional(),
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
  ...baseUpdateSchema,
});

export const ZUpdateFilterSegmentInputSchema = z.discriminatedUnion("scope", [
  teamUpdateSchema,
  userUpdateSchema,
]);

export type TUpdateFilterSegmentInputSchema = z.infer<typeof ZUpdateFilterSegmentInputSchema>;
