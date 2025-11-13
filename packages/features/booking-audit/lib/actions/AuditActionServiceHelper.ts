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
export class AuditActionServiceHelper<TFieldsSchema extends z.ZodTypeAny> {
  private readonly fieldsSchema: TFieldsSchema;
  private readonly version: number;
  private readonly dataSchema: z.ZodObject<{ version: z.ZodLiteral<number>; fields: TFieldsSchema }>;

  constructor({ fieldsSchema, version }: { fieldsSchema: TFieldsSchema, version: number }) {
    this.fieldsSchema = fieldsSchema;
    this.version = version
    this.dataSchema = z.object({
      version: z.literal(this.version),
      fields: this.fieldsSchema,
    });
  }
  /**
   * Parse input fields and wrap with version for writing to database
   */
  parseFields(input: unknown): z.infer<typeof this.dataSchema> {
    const parsed = this.fieldsSchema.parse(input);
    return {
      version: this.version,
      fields: parsed,
    };
  }

  /**
   * Parse stored audit record (includes version wrapper)
   */
  parseStored(data: unknown): z.infer<typeof this.dataSchema> {
    return this.dataSchema.parse(data);
  }

  /**
   * Extract version from stored data
   */
  getVersion(data: unknown): number {
    const parsed = z.object({ version: z.number() }).parse(data);
    return parsed.version;
  }
}

