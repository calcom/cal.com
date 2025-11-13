import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";

/**
 * Attendee Added Audit Action Service
 * Handles ATTENDEE_ADDED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with addedAttendees
 */
export class AttendeeAddedAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        addedAttendees: StringArrayChangeSchema,
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: AttendeeAddedAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = AttendeeAddedAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof AttendeeAddedAuditActionService.schema> {
        const parsedData = AttendeeAddedAuditActionService.dataSchemaV1.parse(input);
        return {
            version: AttendeeAddedAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof AttendeeAddedAuditActionService.schema> {
        return AttendeeAddedAuditActionService.schema.parse(data);
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
    getDisplaySummary(storedData: z.infer<typeof AttendeeAddedAuditActionService.schema>, t: TFunction): string {
        const { data } = storedData;
        return t('audit.added_guests', { count: data.addedAttendees.new.length });
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof AttendeeAddedAuditActionService.schema>, _t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Added Guests': data.addedAttendees.new.join(', '),
            'Count': data.addedAttendees.new.length.toString(),
        };
    }
}

// Input type (without version wrapper) - used by callers
export type AttendeeAddedAuditData = z.infer<typeof AttendeeAddedAuditActionService.dataSchemaV1>;
