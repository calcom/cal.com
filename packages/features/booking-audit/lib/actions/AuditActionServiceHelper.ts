import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Audit Action Service Helper
 * 
 * Provides reusable utility methods for audit action services via composition.
 * 
 * We use composition instead of inheritance for Action services so that services can evolve to v2, v3 independently without polluting a shared base class
 */
export class AuditActionServiceHelper<
  TLatestFieldsSchema extends z.ZodTypeAny,
  TStoredDataSchema extends z.ZodTypeAny
> {
  private readonly latestFieldsSchema: TLatestFieldsSchema;
  private readonly latestVersion: number;
  private readonly storedDataSchema: TStoredDataSchema;

  constructor({
    /**
     * The schema to validate against latest version
     */
    latestFieldsSchema,
    latestVersion,
    /**
     * The schema to validate the stored data that could be of any version
     */
    storedDataSchema,
  }: {
    latestFieldsSchema: TLatestFieldsSchema;
    latestVersion: number;
    storedDataSchema: TStoredDataSchema;
  }) {
    this.latestFieldsSchema = latestFieldsSchema;
    this.latestVersion = latestVersion;
    this.storedDataSchema = storedDataSchema;
  }

  /**
   * Parse input fields with the latest fields schema and wrap with version
   */
  getVersionedData(fields: unknown): { version: number; fields: z.infer<TLatestFieldsSchema> } {
    const parsed = this.latestFieldsSchema.parse(fields);
    return {
      version: this.latestVersion,
      fields: parsed,
    };
  }

  /**
   * Parse stored audit record (includes version wrapper)
   * Accepts any version defined in allVersionsDataSchema (for backward compatibility)
   */
  parseStored(data: unknown): z.infer<TStoredDataSchema> {
    return this.storedDataSchema.parse(data);
  }

  /**
   * Extract version from stored data
   */
  getVersion(data: unknown): number {
    const parsed = z.object({ version: z.number() }).parse(data);
    return parsed.version;
  }

  /**
   * Format date in user's timezone with format: MMM d, yyyy (e.g., "Jul 7, 2025")
   * @param date - Date string or timestamp
   * @param timeZone - User's timezone (defaults to UTC)
   * @returns Formatted date string
   */
  static formatDateInTimeZone(date: string | number, timeZone: string = "UTC"): string {
    return formatInTimeZone(new Date(date), timeZone, "MMM d, yyyy");
  }

  /**
   * Format datetime in user's timezone with format: yyyy-MM-dd HH:mm:ss (e.g., "2025-07-07 09:42:10")
   * @param date - Date string or timestamp
   * @param timeZone - User's timezone (defaults to UTC)
   * @returns Formatted datetime string
   */
  static formatDateTimeInTimeZone(date: string | number, timeZone: string = "UTC"): string {
    return formatInTimeZone(new Date(date), timeZone, "yyyy-MM-dd HH:mm:ss");
  }
}

