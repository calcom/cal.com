import { z } from "zod";
import type { TFunction } from "next-i18next";

import { BooleanChangeSchema } from "../common/changeSchemas";

/**
 * Host No-Show Updated Audit Action Service
 * Handles HOST_NO_SHOW_UPDATED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with noShowHost
 */
export class HostNoShowUpdatedAuditActionService {
    static readonly VERSION = 1;

    // Data schema (without version wrapper) - for input validation
    static readonly dataSchemaV1 = z.object({
        noShowHost: BooleanChangeSchema,
    });

    // Full schema with version wrapper - for stored data
    static readonly schemaV1 = z.object({
        version: z.literal(1),
        data: HostNoShowUpdatedAuditActionService.dataSchemaV1,
    });

    // Current schema (for reading stored data)
    // When adding v2, this will become a discriminated union: z.discriminatedUnion("version", [schemaV1, schemaV2])
    static readonly schema = HostNoShowUpdatedAuditActionService.schemaV1;

    /**
     * Parse input data and wrap with version for writing to database
     * Callers provide just the data fields, this method adds the version wrapper
     */
    parse(input: unknown): z.infer<typeof HostNoShowUpdatedAuditActionService.schema> {
        const parsedData = HostNoShowUpdatedAuditActionService.dataSchemaV1.parse(input);
        return {
            version: HostNoShowUpdatedAuditActionService.VERSION,
            data: parsedData,
        };
    }

    /**
     * Parse stored audit record (includes version wrapper)
     * Use this when reading from database
     */
    parseStored(data: unknown): z.infer<typeof HostNoShowUpdatedAuditActionService.schema> {
        return HostNoShowUpdatedAuditActionService.schema.parse(data);
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
    getDisplaySummary(storedData: z.infer<typeof HostNoShowUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.host_no_show_updated');
    }

    /**
     * Get detailed key-value pairs for display
     * Accepts stored format { version, data: {} } and shows only data fields
     */
    getDisplayDetails(storedData: z.infer<typeof HostNoShowUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Host No-Show': `${data.noShowHost.old ?? false} → ${data.noShowHost.new}`,
        };
    }
}

// Input type (without version wrapper) - used by callers
export type HostNoShowUpdatedAuditData = z.infer<typeof HostNoShowUpdatedAuditActionService.dataSchemaV1>;
