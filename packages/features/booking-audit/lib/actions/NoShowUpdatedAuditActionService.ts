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
// Note: z.record keys are always strings at runtime (JavaScript objects have string keys).
// Using z.coerce.number() ensures string keys like "123" are coerced to numbers during validation.
const fieldsSchemaV1 = z
  .object({
    hostNoShow: BooleanChangeSchema.optional(),
    attendeesNoShow: z.record(z.coerce.number(), BooleanChangeSchema).optional(),
  })
  .refine((data) => data.hostNoShow !== undefined || data.attendeesNoShow !== undefined, {
    message: "At least one of hostNoShow or attendeesNoShow must be provided",
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
    return { key: "booking_audit_action.no_show_updated" };
  }

  getDisplayJson({ storedData }: GetDisplayJsonParams): NoShowUpdatedAuditDisplayData {
    const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
    return {
      hostNoShow: fields.hostNoShow?.new ?? null,
      previousHostNoShow: fields.hostNoShow?.old ?? null,
      attendeesNoShow: fields.attendeesNoShow ?? null,
    };
  }
}

type BooleanChange = z.infer<typeof BooleanChangeSchema>;
type AttendeesNoShowRecord = Record<number, BooleanChange>;

/**
 * Type-safe union that enforces at least one of hostNoShow or attendeesNoShow is provided.
 * This provides compile-time safety in addition to the runtime Zod refine validation.
 *
 * Three valid cases:
 * 1. Host only update: { hostNoShow: BooleanChange }
 * 2. Attendees only update: { attendeesNoShow: AttendeesNoShowRecord }
 * 3. Both updates: { hostNoShow: BooleanChange, attendeesNoShow: AttendeesNoShowRecord }
 */
export type NoShowUpdatedAuditData =
  | { hostNoShow: BooleanChange; attendeesNoShow?: AttendeesNoShowRecord }
  | { hostNoShow?: undefined; attendeesNoShow: AttendeesNoShowRecord };

export type NoShowUpdatedAuditDisplayData = {
  hostNoShow: boolean | null;
  previousHostNoShow: boolean | null;
  attendeesNoShow: Record<number, { old: boolean | null; new: boolean }> | null;
};
