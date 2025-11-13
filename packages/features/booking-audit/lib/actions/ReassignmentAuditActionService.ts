import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, NumberChangeSchema } from "../common/changeSchemas";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with assignedToId, assignedById, reassignmentReason, userPrimaryEmail, title
 */
export class ReassignmentAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        assignedToId: NumberChangeSchema,
        assignedById: NumberChangeSchema,
        reassignmentReason: StringChangeSchema,
        userPrimaryEmail: StringChangeSchema.optional(),
        title: StringChangeSchema.optional(),
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: ReassignmentAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = ReassignmentAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof ReassignmentAuditActionService.schema> {
        const parsedData = ReassignmentAuditActionService.dataSchemaV1.parse(input);
        return {
            version: ReassignmentAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof ReassignmentAuditActionService.schema> {
        return ReassignmentAuditActionService.schema.parse(data);
    }

    /**
     * Extract version from stored data
     */
    getVersion(data: unknown): number {
        const parsed = z.object({ version: z.number() }).parse(data);
        return parsed.version;
    }

    /**
     * Get human-readable summary for display
     * Accepts stored format { version, data: {} } and extracts data for display
     */
    getDisplaySummary(storedData: z.infer<typeof ReassignmentAuditActionService.schema>, t: TFunction): string {
        return t('audit.booking_reassigned');
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof ReassignmentAuditActionService.schema>, _t: TFunction): Record<string, string> {
        const { data } = storedData;
        const details: Record<string, string> = {
            'Assigned To ID': `${data.assignedToId.old ?? '-'} → ${data.assignedToId.new}`,
            'Assigned By ID': `${data.assignedById.old ?? '-'} → ${data.assignedById.new}`,
            'Reason': data.reassignmentReason.new ?? '-',
        };

        // Add optional fields if present
        if (data.userPrimaryEmail) {
            details['Email'] = `${data.userPrimaryEmail.old ?? '-'} → ${data.userPrimaryEmail.new ?? '-'}`;
        }
        if (data.title) {
            details['Title'] = `${data.title.old ?? '-'} → ${data.title.new ?? '-'}`;
        }

        return details;
    }
}

// Input type (without version wrapper) - used by callers
export type ReassignmentAuditData = z.infer<typeof ReassignmentAuditActionService.dataSchemaV1>;
