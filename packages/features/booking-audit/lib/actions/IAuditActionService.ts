import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Interface for Audit Action Services
 * 
 * Defines the contract that all audit action services must implement.
 * Uses composition with AuditActionServiceHelper to provide common functionality
 * while maintaining type safety and flexibility for versioned schemas.
 * 
 * @template TFieldsSchema - The Zod schema type for the service's audit fields
 */
export interface IAuditActionService<TFieldsSchema extends z.ZodTypeAny> {
    /**
     * Current version number for this action type
     */
    readonly VERSION: number;

    /**
     * Fields schema (without version wrapper) for v1
     */
    readonly fieldsSchemaV1: TFieldsSchema;

    /**
     * Data schema including version wrapper
     * Validates the structure stored in BookingAudit.data column: { version: number, fields: TFieldsSchema }
     */
    readonly dataSchema: z.ZodObject<{
        version: z.ZodLiteral<number>;
        fields: TFieldsSchema;
    }>;

    /**
     * Parse input fields and wrap with version for writing to database
     * @param input - Raw input fields (just the audit fields)
     * @returns Parsed data with version wrapper { version, fields }
     */
    parseFields(input: unknown): { version: number; fields: z.infer<TFieldsSchema> };

    /**
     * Parse stored audit record (includes version wrapper)
     * @param data - Stored data from database
     * @returns Parsed stored data { version, fields }
     */
    parseStored(data: unknown): { version: number; fields: z.infer<TFieldsSchema> };

    /**
     * Extract version number from stored data
     * @param data - Stored data from database
     * @returns Version number
     */
    getVersion(data: unknown): number;

    /**
     * Get human-readable summary for display
     * @param storedData - Parsed stored data { version, fields }
     * @param t - Translation function from next-i18next
     * @returns Translated summary string
     */
    getDisplaySummary(storedData: { version: number; fields: z.infer<TFieldsSchema> }, t: TFunction): string;

    /**
     * Get detailed key-value pairs for display
     * @param storedData - Parsed stored data { version, fields }
     * @param t - Translation function from next-i18next
     * @returns Object with display labels as keys and formatted values
     */
    getDisplayDetails(
        storedData: { version: number; fields: z.infer<TFieldsSchema> },
        t: TFunction
    ): Record<string, string>;
}

