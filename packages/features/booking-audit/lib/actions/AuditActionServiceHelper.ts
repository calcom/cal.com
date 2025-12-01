import { z } from "zod";

/**
 * Audit Action Service Helper
 * 
 * Provides reusable utility methods for audit action services via composition.
 * 
 * We use composition instead of inheritance because:
 * - Services can evolve to v2, v3 independently without polluting a shared base class
 * - Easier to test (inject mock helper)
 * - Looser coupling - services explicitly choose what to delegate
 */
export class AuditActionServiceHelper<
  TLatestFieldsSchema extends z.ZodTypeAny,
  TStoredDataSchema extends z.ZodTypeAny
> {
  private readonly latestFieldsSchema: TLatestFieldsSchema;
  private readonly latestVersion: number;
  private readonly storedDataSchema: TStoredDataSchema;

  constructor({
    latestFieldsSchema,
    latestVersion,
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
  getVersionedData(input: unknown): { version: number; fields: z.infer<TLatestFieldsSchema> } {
    const parsed = this.latestFieldsSchema.parse(input);
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

