import { z } from "zod";
import { BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type {
  GetDisplayJsonParams,
  GetDisplayTitleParams,
  IAuditActionService,
  TranslationWithParams,
} from "./IAuditActionService";

/**
 * No-Show Updated Audit Action Service
 * Handles NO_SHOW_UPDATED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
  hostNoShow: BooleanChangeSchema.optional(),
  attendeesNoShow: z.record(z.number(), BooleanChangeSchema).optional(),
});

export class NoShowUpdatedAuditActionService implements IAuditActionService {
  readonly VERSION = 1;
  public static readonly TYPE = "NO_SHOW_UPDATED" as const;
  private static dataSchemaV1 = z.object({
    version: z.literal(1),
    fields: fieldsSchemaV1,
  });
  private static fieldsSchemaV1 = fieldsSchemaV1;
  public static readonly latestFieldsSchema = fieldsSchemaV1;
  // Union of all versions
  public static readonly storedDataSchema = NoShowUpdatedAuditActionService.dataSchemaV1;
  // Union of all versions
  public static readonly storedFieldsSchema = NoShowUpdatedAuditActionService.fieldsSchemaV1;
  private helper: AuditActionServiceHelper<
    typeof NoShowUpdatedAuditActionService.latestFieldsSchema,
    typeof NoShowUpdatedAuditActionService.storedDataSchema
  >;

  constructor() {
    this.helper = new AuditActionServiceHelper({
      latestVersion: this.VERSION,
      latestFieldsSchema: NoShowUpdatedAuditActionService.latestFieldsSchema,
      storedDataSchema: NoShowUpdatedAuditActionService.storedDataSchema,
    });
  }

  getVersionedData(fields: unknown) {
    return this.helper.getVersionedData(fields);
  }

  parseStored(data: unknown) {
    return this.helper.parseStored(data);
  }

  getVersion(data: unknown): number {
    return this.helper.getVersion(data);
  }

  migrateToLatest(data: unknown) {
    // V1-only: validate and return as-is (no migration needed)
    const validated = fieldsSchemaV1.parse(data);
    return { isMigrated: false, latestData: validated };
  }

  async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
    // Display title based on which fields are present could be determined at display time
    // For now, use a generic title
    return { key: "booking_audit_action.no_show_updated" };
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): NoShowUpdatedAuditDisplayData {
    const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
    return {
      host: fields.host?.new ?? null,
      previousHost: fields.host?.old ?? null,
      attendees: fields.attendees ?? null,
    };
  }
}

export type NoShowUpdatedAuditData = z.infer<typeof fieldsSchemaV1>;

export type AttendeeNoShow = z.infer<typeof AttendeeNoShowSchema>;

export type NoShowUpdatedAuditDisplayData = {
  host: boolean | null;
  previousHost: boolean | null;
  attendees: AttendeeNoShow[] | null;
};
