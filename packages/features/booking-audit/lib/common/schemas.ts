import { z } from "zod";

/**
 * Schema for assignment/reassignment context
 * Stores both IDs (for querying) and full context (for display)
 * Used by ReassignmentAuditActionService
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

