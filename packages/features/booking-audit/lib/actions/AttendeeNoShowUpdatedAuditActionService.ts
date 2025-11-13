import { z } from "zod";
import type { TFunction } from "next-i18next";

import { BooleanChangeSchema } from "../common/changeSchemas";

/**
 * Attendee No-Show Updated Audit Action Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with noShowAttendee
 */
export class AttendeeNoShowUpdatedAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        noShowAttendee: BooleanChangeSchema,
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: AttendeeNoShowUpdatedAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = AttendeeNoShowUpdatedAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema> {
        const parsedData = AttendeeNoShowUpdatedAuditActionService.dataSchemaV1.parse(input);
        return {
            version: AttendeeNoShowUpdatedAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema> {
        return AttendeeNoShowUpdatedAuditActionService.schema.parse(data);
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
    getDisplaySummary(storedData: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Attendee No-Show': `${data.noShowAttendee.old ?? false} → ${data.noShowAttendee.new}`,
        };
    }
}

// Input type (without version wrapper) - used by callers
export type AttendeeNoShowUpdatedAuditData = z.infer<typeof AttendeeNoShowUpdatedAuditActionService.dataSchemaV1>;
