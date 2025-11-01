import { z } from "zod";

/**
 * Schema for tracking field-level changes in audit records
 * oldValue and newValue are optional to support creation (no oldValue) and deletion (no newValue)
 */
export const ChangeSchema = z.object({
    field: z.string(),
    oldValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
});

/**
 * Schema for assignment/reassignment context
 * Stores both IDs (for querying) and full context (for display)
 */
export const AssignmentDetailsSchema = z.object({
    // IDs for querying
    teamId: z.number().optional(),
    teamName: z.string().optional(),

    // User details (historical snapshot for display)
    assignedUser: z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
    }),
    previousUser: z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
    }).optional(), // Optional: first assignment has no previous user
});

