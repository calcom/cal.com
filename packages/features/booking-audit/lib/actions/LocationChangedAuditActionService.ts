import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with location
 */
export class LocationChangedAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        location: StringChangeSchema,
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: LocationChangedAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = LocationChangedAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof LocationChangedAuditActionService.schema> {
        const parsedData = LocationChangedAuditActionService.dataSchemaV1.parse(input);
        return {
            version: LocationChangedAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof LocationChangedAuditActionService.schema> {
        return LocationChangedAuditActionService.schema.parse(data);
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
    getDisplaySummary(storedData: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): string {
        return t('audit.location_changed');
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof LocationChangedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Previous Location': data.location.old ?? '-',
            'New Location': data.location.new ?? '-',
        };
    }
}

// Input type (without version wrapper) - used by callers
export type LocationChangedAuditData = z.infer<typeof LocationChangedAuditActionService.dataSchemaV1>;
