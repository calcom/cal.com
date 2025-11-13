import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";

/**
 * Cancelled Audit Action Service
 * Handles CANCELLED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with cancellationReason, cancelledBy, status
 */
export class CancelledAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        cancellationReason: StringChangeSchema,
        cancelledBy: StringChangeSchema,
        status: StringChangeSchema,
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: CancelledAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = CancelledAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof CancelledAuditActionService.schema> {
        const parsedData = CancelledAuditActionService.dataSchemaV1.parse(input);
        return {
            version: CancelledAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof CancelledAuditActionService.schema> {
        return CancelledAuditActionService.schema.parse(data);
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
    getDisplaySummary(storedData: z.infer<typeof CancelledAuditActionService.schema>, t: TFunction): string {
        return t('audit.cancelled_booking');
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof CancelledAuditActionService.schema>, _t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Cancellation Reason': data.cancellationReason.new ?? '-',
            'Previous Reason': data.cancellationReason.old ?? '-',
            'Cancelled By': `${data.cancelledBy.old ?? '-'} → ${data.cancelledBy.new ?? '-'}`,
        };
    }
}

// Input type (without version wrapper) - used by callers
export type CancelledAuditData = z.infer<typeof CancelledAuditActionService.dataSchemaV1>;
