import { z } from "zod";

/**
 * Represents a component that can be interpolated into translations
 * Used with react-i18next Trans component for proper i18n support (RTL, word order, etc.)
 */
export type TranslationComponent = {
    type: "link";
    href: string;
};

/**
 * Represents a translation key with optional interpolation params and components
 * Used for dynamic display titles that need to be translated with context
 * Components are used for clickable links within translations (e.g., "Rescheduled to <1>New Booking</1>")
 */
export type TranslationWithParams = {
    key: string;
    params?: Record<string, string | number>;
    components?: TranslationComponent[];
};

/**
 * Interface for Audit Action Services
 * 
 * Defines the contract that all audit action services must implement.
 * Uses composition with AuditActionServiceHelper to provide common functionality
 * while maintaining type safety and flexibility for versioned schemas.
 * 
 * @template TLatestFieldsSchema - The Zod schema type for the latest version's audit fields (write operations)
 * @template TStoredFieldsSchema - The Zod schema type for all supported versions' audit fields (read operations, union type)
 */
export interface IAuditActionService<
    TLatestFieldsSchema extends z.ZodTypeAny,
    TStoredFieldsSchema extends z.ZodTypeAny
> {
    /**
     * Current version number for this action type
     */
    readonly VERSION: number;

    /**
     * Parse given fields against latest schema and wrap with version
     * @param fields - Raw input fields (just the audit fields)
     * @returns Parsed data with version wrapper { version, fields }
     */
    getVersionedData(fields: unknown): { version: number; fields: z.infer<TLatestFieldsSchema> };

    /**
     * Parse stored audit record (includes version wrapper)
     * Accepts data from ANY supported version (not just latest) for backward compatibility
     * @param data - Stored data from database (can be any version)
     * @returns Parsed stored data { version, fields } - version may differ from current VERSION
     */
    parseStored(data: unknown): { version: number; fields: z.infer<TStoredFieldsSchema> };

    /**
     * Extract version number from stored data
     * @param data - Stored data from database
     * @returns Version number
     */
    getVersion(data: unknown): number;

    /**
     * Get flattened JSON data for display (fields only, no version wrapper)
     * Optional - implement only if custom display formatting is needed
     * @param params - Object containing storedData and userTimeZone
     * @param params.storedData - Parsed stored data { version, fields }
     * @param params.userTimeZone - User's timezone for datetime formatting (required)
     * @returns The fields object without version wrapper and we decide what fields to show to the client
     */
    getDisplayJson?(params: { storedData: { version: number; fields: z.infer<TStoredFieldsSchema> }; userTimeZone: string }): unknown;

    /**
     * Get the display title for the audit action
     * Returns a translation key with optional interpolation params for dynamic titles
     * (e.g., "Booking reassigned to John Doe" instead of just "Reassignment")
     * @param params - Object containing storedData and userTimeZone
     * @param params.storedData - Parsed stored data { version, fields }
     * @param params.userTimeZone - User's timezone for date formatting (required)
     * @returns Translation key with optional interpolation params
     */
    getDisplayTitle(params: { storedData: { version: number; fields: z.infer<TStoredFieldsSchema> }; userTimeZone: string }): Promise<TranslationWithParams>;

    /**
     * Returns additional display fields with translation keys for frontend rendering
     * Optional - implement only if custom display fields are needed
     * @param storedData - Parsed stored data { version, fields }
     * @returns Array of field objects with label and value translation keys
     */
    getDisplayFields?(storedData: { version: number; fields: z.infer<TStoredFieldsSchema> }): Array<{
        labelKey: string;  // Translation key for field label
        valueKey: string;  // Translation key for field value
    }>;

    /**
     * Migrate old version data to latest version
     * 
     * Required method that validates and migrates data to latest schema version.
     * For V1-only actions, simply validates and returns with isMigrated=false.
     * For multi-version actions, checks version and transforms if needed.
     * 
     * @param data - Data from task payload (any supported version)
     * @returns Migration result with status and latest data
     */
    migrateToLatest(data: unknown): {
        /**
         * True if migration was performed, false if already latest
         */
        isMigrated: boolean;
        /**
         * Always set, either migrated or original
         */
        latestData: z.infer<TLatestFieldsSchema>;
    };
}