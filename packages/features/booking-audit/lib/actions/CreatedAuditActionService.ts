import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

/**
 * Created Audit Action Service
 * Handles RECORD_CREATED action with per-action versioning
 * 
 * Note: CREATED action captures initial state, so it doesn't use { old, new } pattern
 * 
 * Version History:
 * - v1: Initial schema with startTime, endTime, status
 */
export class CreatedAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        startTime: z.string(),
        endTime: z.string(),
        status: z.nativeEnum(BookingStatus),
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: CreatedAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = CreatedAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof CreatedAuditActionService.schema> {
        const parsedData = CreatedAuditActionService.dataSchemaV1.parse(input);
        return {
            version: CreatedAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof CreatedAuditActionService.schema> {
        return CreatedAuditActionService.schema.parse(data);
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
    getDisplaySummary(storedData: z.infer<typeof CreatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.booking_created');
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof CreatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Start Time': dayjs(data.startTime).format('MMM D, YYYY h:mm A'),
            'End Time': dayjs(data.endTime).format('MMM D, YYYY h:mm A'),
            'Initial Status': data.status,
        };
    }
}

// Input type (without version wrapper) - used by callers
export type CreatedAuditData = z.infer<typeof CreatedAuditActionService.dataSchemaV1>;

