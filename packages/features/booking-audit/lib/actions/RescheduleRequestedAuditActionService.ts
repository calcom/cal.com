import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, BooleanChangeSchema } from "../common/changeSchemas";

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with cancellationReason, cancelledBy, rescheduled
 */
export class RescheduleRequestedAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        cancellationReason: StringChangeSchema,
        cancelledBy: StringChangeSchema,
        rescheduled: BooleanChangeSchema.optional(),
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: RescheduleRequestedAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = RescheduleRequestedAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof RescheduleRequestedAuditActionService.schema> {
        const parsedData = RescheduleRequestedAuditActionService.dataSchemaV1.parse(input);
        return {
            version: RescheduleRequestedAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof RescheduleRequestedAuditActionService.schema> {
        return RescheduleRequestedAuditActionService.schema.parse(data);
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
    getDisplaySummary(storedData: z.infer<typeof RescheduleRequestedAuditActionService.schema>, t: TFunction): string {
        return t('audit.reschedule_requested');
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof RescheduleRequestedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const { data } = storedData;
        const details: Record<string, string> = {};
        if (data.cancellationReason) {
            details['Reason'] = data.cancellationReason.new ?? '-';
        }
        if (data.cancelledBy) {
            details['Cancelled By'] = `${data.cancelledBy.old ?? '-'} → ${data.cancelledBy.new ?? '-'}`;
        }
        if (data.rescheduled) {
            details['Rescheduled'] = `${data.rescheduled.old ?? false} → ${data.rescheduled.new}`;
        }
        return details;
    }
}

// Input type (without version wrapper) - used by callers
export type RescheduleRequestedAuditData = z.infer<typeof RescheduleRequestedAuditActionService.dataSchemaV1>;
