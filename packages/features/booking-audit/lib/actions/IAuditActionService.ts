import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Interface for Audit Action Services
 * 
 * Defines the contract that all audit action services must implement.
 * Uses composition with AuditActionServiceHelper to provide common functionality
 * while maintaining type safety and flexibility for versioned schemas.
 * 
 * @template TDataSchema - The Zod schema type for the service's data fields
 */
export interface IAuditActionService<TDataSchema extends z.ZodTypeAny> {
    /**
     * Current version number for this action type
     */
    readonly VERSION: number;

    /**
     * Data schema (without version wrapper) for v1
     */
    readonly dataSchemaV1: TDataSchema;

    /**
     * Full schema getter including version wrapper
     * Returns a schema that validates { version: number, data: TDataSchema }
     */
    readonly schema: z.ZodObject<{
        version: z.ZodLiteral<number>;
        data: TDataSchema;
    }>;

    /**
     * Parse input data and wrap with version for writing to database
     * @param input - Raw input data (just the data fields)
     * @returns Parsed data with version wrapper { version, data }
     */
    parse(input: unknown): { version: number; data: z.infer<TDataSchema> };

    /**
     * Parse stored audit record (includes version wrapper)
     * @param data - Stored data from database
     * @returns Parsed stored data { version, data }
     */
    parseStored(data: unknown): { version: number; data: z.infer<TDataSchema> };

    /**
     * Extract version number from stored data
     * @param data - Stored data from database
     * @returns Version number
     */
    getVersion(data: unknown): number;

    /**
     * Get human-readable summary for display
     * @param storedData - Parsed stored data { version, data }
     * @param t - Translation function from next-i18next
     * @returns Translated summary string
     */
    getDisplaySummary(storedData: { version: number; data: z.infer<TDataSchema> }, t: TFunction): string;

    /**
     * Get detailed key-value pairs for display
     * @param storedData - Parsed stored data { version, data }
     * @param t - Translation function from next-i18next
     * @returns Object with display labels as keys and formatted values
     */
    getDisplayDetails(
        storedData: { version: number; data: z.infer<TDataSchema> },
        t: TFunction
    ): Record<string, string>;
}

