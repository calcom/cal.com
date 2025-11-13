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
export class AuditActionServiceHelper<TDataSchema extends z.ZodTypeAny> {
  private readonly dataSchema: TDataSchema;
  private readonly version: number;
  private readonly schema: z.ZodObject<{ version: z.ZodLiteral<number>; data: TDataSchema }>;

  constructor({ dataSchema, version }: { dataSchema: TDataSchema, version: number }) {
    this.dataSchema = dataSchema;
    this.version = version
    this.schema = z.object({
      version: z.literal(this.version),
      data: this.dataSchema,
    });
  }
  /**
   * Parse input data and wrap with version for writing to database
   */
  parse(input: unknown): z.infer<typeof this.schema> {
    const parsed = this.dataSchema.parse(input);
    return {
      version: this.version,
      data: parsed,
    };
  }

  /**
   * Parse stored audit record (includes version wrapper)
   */
  parseStored(data: unknown): z.infer<typeof this.schema> {
    return this.schema.parse(data);
  }

  /**
   * Extract version from stored data
   */
  getVersion(data: unknown): number {
    const parsed = z.object({ version: z.number() }).parse(data);
    return parsed.version;
  }
}

