import { z } from "zod";

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
}

